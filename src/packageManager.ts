import * as fs from 'fs-extra';
import * as path from 'path';
import * as vscode from 'vscode';
import { parseString } from 'xml2js';

export interface PackageInfo {
    name: string;
    version: string;
    path: string;
    description?: string;
}

export interface BoardInfo {
    id: string;
    name: string;
    description: string;
    imagePath?: string;
    mcu: string;
}

export interface ProjectInfo {
    name: string;
    description: string;
    path: string;
    toolchain: string[];
}

export class PackageManager {
    
    async analyzePackage(packagePath: string): Promise<PackageInfo> {
        try {
            // Look for package descriptor files
            const packageFile = await this.findPackageDescriptor(packagePath);
            
            if (packageFile) {
                return await this.parsePackageDescriptor(packageFile);
            }

            // Fallback: analyze directory structure
            const packageName = path.basename(packagePath);
            return {
                name: packageName,
                version: 'Unknown',
                path: packagePath,
                description: `STM32 Package: ${packageName}`
            };
        } catch (error) {
            throw new Error(`Failed to analyze package: ${error}`);
        }
    }

    async getAvailableBoards(packagePath: string): Promise<BoardInfo[]> {
        const boards: BoardInfo[] = [];
        
        try {
            console.log(`Analyzing package at: ${packagePath}`);
            
            // STM32Cube packages have this structure:
            // Projects/[BoardName]/[Examples|Applications|Demonstrations]/[ProjectName]/...
            // The board names are the directories directly under Projects/
            
            const projectsPath = path.join(packagePath, 'Projects');
            console.log(`Checking Projects directory: ${projectsPath}`);

            if (await fs.pathExists(projectsPath)) {
                console.log(`✅ Projects directory found`);
                const foundBoards = await this.scanForBoards(projectsPath);
                console.log(`Found ${foundBoards.length} boards in Projects`);
                boards.push(...foundBoards);
            } else {
                console.log(`❌ Projects directory not found at ${projectsPath}`);
                
                // Fallback: check if there are other common directories
                const fallbackPaths = [
                    path.join(packagePath, 'Examples'),
                    path.join(packagePath, 'Applications'),
                    path.join(packagePath, 'Demonstrations')
                ];
                
                for (const fallbackPath of fallbackPaths) {
                    if (await fs.pathExists(fallbackPath)) {
                        console.log(`Found fallback directory: ${fallbackPath}`);
                        const fallbackBoards = await this.scanForBoards(fallbackPath);
                        boards.push(...fallbackBoards);
                    }
                }
            }

            // Remove duplicates by board ID
            const uniqueBoards = boards.filter((board, index, self) => 
                index === self.findIndex(b => b.id === board.id)
            );

            console.log(`Total unique boards found: ${uniqueBoards.length}`);
            uniqueBoards.forEach(board => console.log(`Board: ${board.id} - ${board.name}`));

            return uniqueBoards;
        } catch (error) {
            console.error('Error getting available boards:', error);
            return [];
        }
    }

    async getProjectsForBoard(packagePath: string, boardId: string): Promise<ProjectInfo[]> {
        const projects: ProjectInfo[] = [];
        
        try {
            console.log(`Getting projects for board: ${boardId} in package: ${packagePath}`);
            
            // STM32Cube structure: Projects/[BoardName]/[Examples|Applications|Demonstrations]/[ProjectName]/
            const boardPath = path.join(packagePath, 'Projects', boardId);
            console.log(`Checking board path: ${boardPath}`);
            
            if (await fs.pathExists(boardPath)) {
                console.log(`✅ Board directory found: ${boardPath}`);
                
                // Look for project categories under the board directory
                const projectCategories = ['Examples', 'Applications', 'Demonstrations', 'Templates'];
                
                for (const category of projectCategories) {
                    const categoryPath = path.join(boardPath, category);
                    if (await fs.pathExists(categoryPath)) {
                        console.log(`Found category: ${category} at ${categoryPath}`);
                        const categoryProjects = await this.scanForProjects(categoryPath);
                        console.log(`Found ${categoryProjects.length} projects in ${category}`);
                        
                        // Add category prefix to project names for clarity
                        categoryProjects.forEach(project => {
                            project.name = `${category}/${project.name}`;
                            project.description = `${category}: ${project.description}`;
                        });
                        
                        projects.push(...categoryProjects);
                    }
                }
            } else {
                console.log(`❌ Board directory not found: ${boardPath}`);
            }

            console.log(`Total projects found for ${boardId}: ${projects.length}`);
            projects.forEach(project => console.log(`Project: ${project.name}`));

            return projects;
        } catch (error) {
            console.error('Error getting projects for board:', error);
            return [];
        }
    }

    async importProject(packagePath: string, boardId: string, projectName: string): Promise<string> {
        try {
            // Get target location from user
            const options: vscode.OpenDialogOptions = {
                canSelectMany: false,
                canSelectFiles: false,
                canSelectFolders: true,
                openLabel: 'Select Import Location'
            };

            const folderUri = await vscode.window.showOpenDialog(options);
            if (!folderUri || !folderUri[0]) {
                throw new Error('No import location selected');
            }

            const targetPath = path.join(folderUri[0].fsPath, projectName);
            
            // Find the project source
            const projectSource = await this.findProjectSource(packagePath, boardId, projectName);
            if (!projectSource) {
                throw new Error(`Project ${projectName} not found for board ${boardId}`);
            }

            // Copy project files
            await fs.copy(projectSource, targetPath);
            
            // Update project configuration if needed
            await this.updateProjectConfiguration(targetPath, projectName);

            return targetPath;
        } catch (error) {
            throw new Error(`Failed to import project: ${error}`);
        }
    }

    private async findPackageDescriptor(packagePath: string): Promise<string | null> {
        const possibleFiles = [
            'package.xml',
            'package.pdsc',
            '.pdsc',
            'package.json'
        ];

        for (const file of possibleFiles) {
            const filePath = path.join(packagePath, file);
            if (await fs.pathExists(filePath)) {
                return filePath;
            }
        }

        // Look for .pdsc files in the root
        const files = await fs.readdir(packagePath);
        for (const file of files) {
            if (file.endsWith('.pdsc')) {
                return path.join(packagePath, file);
            }
        }

        return null;
    }

    private async parsePackageDescriptor(filePath: string): Promise<PackageInfo> {
        const content = await fs.readFile(filePath, 'utf8');
        const packagePath = path.dirname(filePath);
        
        if (filePath.endsWith('.json')) {
            const packageJson = JSON.parse(content);
            return {
                name: packageJson.name || 'Unknown Package',
                version: packageJson.version || '1.0.0',
                path: packagePath,
                description: packageJson.description
            };
        } else if (filePath.endsWith('.pdsc') || filePath.endsWith('.xml')) {
            return new Promise((resolve, reject) => {
                parseString(content, (err: any, result: any) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    try {
                        const packageInfo = result.package || result;
                        resolve({
                            name: packageInfo.$.name || 'Unknown Package',
                            version: packageInfo.$.version || '1.0.0',
                            path: packagePath,
                            description: packageInfo.description?.[0] || undefined
                        });
                    } catch (parseError) {
                        resolve({
                            name: path.basename(packagePath),
                            version: '1.0.0',
                            path: packagePath
                        });
                    }
                });
            });
        }

        return {
            name: path.basename(packagePath),
            version: '1.0.0',
            path: packagePath
        };
    }

    private async scanForBoards(boardPath: string): Promise<BoardInfo[]> {
        const boards: BoardInfo[] = [];
        
        try {
            const entries = await fs.readdir(boardPath, { withFileTypes: true });
            
            for (const entry of entries) {
                if (entry.isDirectory()) {
                    const boardDir = path.join(boardPath, entry.name);
                    const board = await this.analyzeBoardDirectory(boardDir, entry.name);
                    if (board) {
                        boards.push(board);
                    }
                }
            }
        } catch (error) {
            console.error('Error scanning for boards:', error);
        }

        return boards;
    }

    private async analyzeBoardDirectory(boardDir: string, boardName: string): Promise<BoardInfo | null> {
        try {
            console.log(`Analyzing board directory: ${boardDir}`);
            
            // Check if this directory actually contains projects (indicating it's a board folder)
            const hasProjects = await this.hasProjectsInDirectory(boardDir);
            if (!hasProjects) {
                console.log(`Skipping ${boardName} - no projects found`);
                return null;
            }
            
            // Look for board images in common locations
            const imagePath = await this.findBoardImage(boardDir);
            
            // Try to extract MCU information from project files
            const mcu = await this.extractMcuInfo(boardDir);
            
            // Create a more descriptive board name
            const formattedName = this.formatBoardName(boardName);
            
            console.log(`Found board: ${boardName} -> ${formattedName}, MCU: ${mcu || 'Unknown'}`);

            return {
                id: boardName,
                name: formattedName,
                description: `STM32 Development Board: ${formattedName}${mcu ? ` (${mcu})` : ''}`,
                imagePath: imagePath,
                mcu: mcu || 'STM32'
            };
        } catch (error) {
            console.error(`Error analyzing board directory ${boardDir}:`, error);
            return null;
        }
    }

    private async hasProjectsInDirectory(boardDir: string): Promise<boolean> {
        try {
            const entries = await fs.readdir(boardDir, { withFileTypes: true });
            
            // In STM32Cube structure, board directories contain category folders like Examples, Applications, etc.
            const categoryDirs = entries.filter(entry => 
                entry.isDirectory() && 
                ['Examples', 'Applications', 'Demonstrations', 'Templates'].includes(entry.name)
            );
            
            if (categoryDirs.length === 0) {
                console.log(`No project categories found in ${boardDir}`);
                return false;
            }
            
            // Check if at least one category contains actual projects
            for (const categoryDir of categoryDirs.slice(0, 2)) { // Check first 2 categories
                const categoryPath = path.join(boardDir, categoryDir.name);
                const hasProjects = await this.hasProjectsInCategory(categoryPath);
                if (hasProjects) {
                    console.log(`Found projects in ${categoryDir.name} category`);
                    return true;
                }
            }
            
            console.log(`No projects found in any category in ${boardDir}`);
            return false;
        } catch (error) {
            console.error(`Error checking projects in ${boardDir}:`, error);
            return false;
        }
    }

    private async hasProjectsInCategory(categoryPath: string): Promise<boolean> {
        try {
            const entries = await fs.readdir(categoryPath, { withFileTypes: true });
            const projectDirs = entries.filter(entry => entry.isDirectory());
            
            if (projectDirs.length === 0) {
                return false;
            }
            
            // Check if at least one directory contains project files
            for (const projectDir of projectDirs.slice(0, 3)) { // Check first 3 projects
                const projectPath = path.join(categoryPath, projectDir.name);
                const hasProjectFiles = await this.hasProjectFiles(projectPath);
                if (hasProjectFiles) {
                    return true;
                }
            }
            
            return false;
        } catch (error) {
            return false;
        }
    }

    private async hasProjectFiles(projectPath: string): Promise<boolean> {
        try {
            const files = await fs.readdir(projectPath);
            
            // Look for common project files
            const projectIndicators = [
                '.uvprojx',    // Keil
                '.eww', '.ewp', // IAR
                '.cproject',   // Eclipse/STM32CubeIDE
                'Makefile',    // GCC
                '.ioc',        // STM32CubeMX
                'main.c', 'main.cpp', // Source files
                'Inc/', 'Src/', // Common directories
                'Core/'        // STM32CubeIDE structure
            ];
            
            return files.some(file => 
                projectIndicators.some(indicator => 
                    file.includes(indicator) || 
                    file.endsWith(indicator) ||
                    file.toLowerCase().includes(indicator.toLowerCase())
                )
            );
        } catch (error) {
            return false;
        }
    }

    private async findBoardImage(boardDir: string): Promise<string | undefined> {
        const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.bmp'];
        const commonNames = ['board', 'image', 'picture', 'photo'];
        
        try {
            const files = await fs.readdir(boardDir);
            
            for (const file of files) {
                const ext = path.extname(file).toLowerCase();
                const name = path.basename(file, ext).toLowerCase();
                
                if (imageExtensions.includes(ext) && 
                    (commonNames.some(n => name.includes(n)) || name.includes('board'))) {
                    return path.join(boardDir, file);
                }
            }
        } catch (error) {
            // Ignore errors when looking for images
        }
        
        return undefined;
    }

    private async extractMcuInfo(boardDir: string): Promise<string | undefined> {
        try {
            // Look for configuration files that might contain MCU info
            const files = await fs.readdir(boardDir);
            
            for (const file of files) {
                const filePath = path.join(boardDir, file);
                try {
                    const stat = await fs.stat(filePath);
                    if (stat.isFile() && (file.endsWith('.h') || file.endsWith('.ioc'))) {
                        const content = await fs.readFile(filePath, 'utf8');
                        const mcuMatch = content.match(/STM32[A-Z]\d+/i);
                        if (mcuMatch) {
                            return mcuMatch[0].toUpperCase();
                        }
                    }
                } catch (fileError) {
                    // Skip files that can't be read
                    continue;
                }
            }
        } catch (error) {
            // Ignore errors when extracting MCU info
        }
        
        return undefined;
    }

    private formatBoardName(name: string): string {
        // Handle common STM32 board naming patterns
        let formatted = name;
        
        // Handle patterns like "STM32U575I-EV" or "NUCLEO-U575ZI-Q"
        formatted = formatted
            .replace(/[-_]/g, ' ')                    // Replace hyphens and underscores with spaces
            .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2') // Add space between uppercase sequences
            .replace(/([a-z])([A-Z])/g, '$1 $2')      // Add space between lowercase and uppercase
            .replace(/\b\w/g, l => l.toUpperCase())   // Capitalize first letter of each word
            .replace(/\s+/g, ' ')                     // Remove multiple spaces
            .trim();
        
        // Handle specific STM32 patterns
        if (formatted.includes('NUCLEO')) {
            formatted = formatted.replace('NUCLEO', 'NUCLEO-');
        }
        if (formatted.includes('DISCO')) {
            formatted = formatted.replace('DISCO', 'DISCOVERY');
        }
        if (formatted.includes('EVAL')) {
            formatted = formatted.replace('EVAL', 'EVALUATION');
        }
        
        return formatted;
    }

    private async scanForProjects(projectPath: string): Promise<ProjectInfo[]> {
        const projects: ProjectInfo[] = [];
        
        try {
            const entries = await fs.readdir(projectPath, { withFileTypes: true });
            
            for (const entry of entries) {
                if (entry.isDirectory()) {
                    const projectDir = path.join(projectPath, entry.name);
                    const project = await this.analyzeProjectDirectory(projectDir, entry.name);
                    if (project) {
                        projects.push(project);
                    }
                }
            }
        } catch (error) {
            console.error('Error scanning for projects:', error);
        }

        return projects;
    }

    private async analyzeProjectDirectory(projectDir: string, projectName: string): Promise<ProjectInfo | null> {
        try {
            // Detect supported toolchains
            const toolchains: string[] = [];
            
            const toolchainFiles = [
                { file: '*.uvprojx', name: 'Keil' },
                { file: '*.eww', name: 'IAR' },
                { file: 'STM32*', name: 'STM32CubeIDE' },
                { file: 'Makefile', name: 'GCC' },
                { file: '*.cproject', name: 'Eclipse' }
            ];

            for (const tc of toolchainFiles) {
                if (await this.hasMatchingFile(projectDir, tc.file)) {
                    toolchains.push(tc.name);
                }
            }

            if (toolchains.length === 0) {
                toolchains.push('Generic');
            }

            return {
                name: this.formatProjectName(projectName),
                description: `STM32 Project: ${this.formatProjectName(projectName)}`,
                path: projectDir,
                toolchain: toolchains
            };
        } catch (error) {
            console.error(`Error analyzing project directory ${projectDir}:`, error);
            return null;
        }
    }

    private async hasMatchingFile(dir: string, pattern: string): Promise<boolean> {
        try {
            const files = await fs.readdir(dir);
            return files.some((file: string) => {
                if (pattern.includes('*')) {
                    const regex = new RegExp(pattern.replace(/\*/g, '.*'), 'i');
                    return regex.test(file);
                }
                return file === pattern;
            });
        } catch (error) {
            return false;
        }
    }

    private formatProjectName(name: string): string {
        return name
            .replace(/[-_]/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
    }

    private async findProjectSource(packagePath: string, boardId: string, projectName: string): Promise<string | null> {
        const possiblePaths = [
            path.join(packagePath, 'Projects', boardId, projectName),
            path.join(packagePath, 'Examples', boardId, projectName),
            path.join(packagePath, 'Applications', boardId, projectName)
        ];

        for (const projectPath of possiblePaths) {
            if (await fs.pathExists(projectPath)) {
                return projectPath;
            }
        }

        return null;
    }

    private async updateProjectConfiguration(projectPath: string, projectName: string): Promise<void> {
        // Update project files with the new project name if needed
        try {
            // This could be extended to update specific configuration files
            console.log(`Project ${projectName} imported to ${projectPath}`);
        } catch (error) {
            console.error('Error updating project configuration:', error);
        }
    }
} 