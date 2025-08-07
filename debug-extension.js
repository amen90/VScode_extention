const fs = require('fs-extra');
const path = require('path');

// Simulate the exact extension logic
class PackageManager {
    async analyzePackage(packagePath) {
        try {
            console.log(`📦 Analyzing package: ${packagePath}`);
            
            // Check if path exists
            if (!await fs.pathExists(packagePath)) {
                throw new Error(`Package path does not exist: ${packagePath}`);
            }
            
            // Look for package descriptor files
            const packageFile = await this.findPackageDescriptor(packagePath);
            
            if (packageFile) {
                console.log(`📄 Found package descriptor: ${packageFile}`);
                return await this.parsePackageDescriptor(packageFile);
            }

            // Fallback: analyze directory structure
            const packageName = path.basename(packagePath);
            console.log(`📁 Using directory name as package name: ${packageName}`);
            
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

    async getAvailableBoards(packagePath) {
        const boards = [];
        
        try {
            console.log(`🔍 Getting available boards from: ${packagePath}`);
            
            const projectsPath = path.join(packagePath, 'Projects');
            console.log(`📂 Checking Projects directory: ${projectsPath}`);

            if (await fs.pathExists(projectsPath)) {
                console.log(`✅ Projects directory found`);
                const foundBoards = await this.scanForBoards(projectsPath);
                console.log(`🎯 Found ${foundBoards.length} boards in Projects`);
                boards.push(...foundBoards);
            } else {
                console.log(`❌ Projects directory not found at ${projectsPath}`);
                
                // List what IS in the directory
                console.log(`📋 Contents of ${packagePath}:`);
                const contents = await fs.readdir(packagePath);
                contents.forEach(item => console.log(`  - ${item}`));
            }

            return boards;
        } catch (error) {
            console.error('❌ Error getting available boards:', error);
            return [];
        }
    }

    async scanForBoards(boardPath) {
        const boards = [];
        
        try {
            console.log(`🔍 Scanning for boards in: ${boardPath}`);
            const entries = await fs.readdir(boardPath, { withFileTypes: true });
            
            console.log(`📋 Found ${entries.length} entries in Projects directory:`);
            entries.forEach(entry => {
                console.log(`  ${entry.isDirectory() ? '📁' : '📄'} ${entry.name}`);
            });
            
            for (const entry of entries) {
                if (entry.isDirectory()) {
                    console.log(`\n🔍 Analyzing potential board: ${entry.name}`);
                    const boardDir = path.join(boardPath, entry.name);
                    const board = await this.analyzeBoardDirectory(boardDir, entry.name);
                    if (board) {
                        console.log(`✅ Valid board found: ${entry.name}`);
                        boards.push(board);
                    } else {
                        console.log(`❌ Not a valid board: ${entry.name}`);
                    }
                }
            }
        } catch (error) {
            console.error('❌ Error scanning for boards:', error);
        }

        return boards;
    }

    async analyzeBoardDirectory(boardDir, boardName) {
        try {
            console.log(`  📂 Checking board directory: ${boardDir}`);
            
            // Check if this directory actually contains projects
            const hasProjects = await this.hasProjectsInDirectory(boardDir);
            if (!hasProjects) {
                console.log(`  ❌ No projects found in ${boardName}`);
                return null;
            }
            
            console.log(`  ✅ Projects found in ${boardName}`);
            
            return {
                id: boardName,
                name: this.formatBoardName(boardName),
                description: `STM32 Development Board: ${this.formatBoardName(boardName)}`,
                imagePath: undefined,
                mcu: 'STM32U5'
            };
        } catch (error) {
            console.error(`❌ Error analyzing board directory ${boardDir}:`, error);
            return null;
        }
    }

    async hasProjectsInDirectory(boardDir) {
        try {
            console.log(`    📋 Checking contents of ${boardDir}:`);
            const entries = await fs.readdir(boardDir, { withFileTypes: true });
            
            entries.forEach(entry => {
                console.log(`      ${entry.isDirectory() ? '📁' : '📄'} ${entry.name}`);
            });
            
            // Look for project category directories
            const categoryDirs = entries.filter(entry => 
                entry.isDirectory() && 
                ['Examples', 'Applications', 'Demonstrations', 'Templates'].includes(entry.name)
            );
            
            console.log(`    🎯 Found ${categoryDirs.length} project categories: ${categoryDirs.map(d => d.name).join(', ')}`);
            
            return categoryDirs.length > 0;
        } catch (error) {
            console.error(`    ❌ Error checking projects in ${boardDir}:`, error);
            return false;
        }
    }

    formatBoardName(name) {
        return name
            .replace(/[-_]/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
    }

    async findPackageDescriptor(packagePath) {
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

        return null;
    }

    async parsePackageDescriptor(filePath) {
        // Simplified version - just return basic info
        const packagePath = path.dirname(filePath);
        return {
            name: path.basename(packagePath),
            version: '1.8.0',
            path: packagePath
        };
    }
}

// Test with common STM32Cube locations
async function testExtensionLogic() {
    console.log('🧪 Testing Extension Logic with Real Package\n');
    
    const packageManager = new PackageManager();
    
    // Try common locations for STM32Cube packages
    const possiblePaths = [
        'C:\\Users\\amen\\Documents\\STM32CUBEU5-V1-8-0\\STM32Cube_FW_U5_V1.8.0',
        'C:\\Users\\amen\\STM32Cube\\Repository\\STM32Cube_FW_U5_V1.8.0',
        'C:\\ST\\STM32Cube_FW_U5_V1.8.0',
        'C:\\STM32Cube_FW_U5_V1.8.0'
    ];
    
    let packagePath = null;
    
    // Find the correct path
    for (const testPath of possiblePaths) {
        if (await fs.pathExists(testPath)) {
            packagePath = testPath;
            console.log(`✅ Found package at: ${packagePath}`);
            break;
        } else {
            console.log(`❌ Not found: ${testPath}`);
        }
    }
    
    if (!packagePath) {
        console.log('\n❌ Could not find STM32Cube package in common locations.');
        console.log('Please run this script with the correct path:');
        console.log('node debug-extension.js "C:\\path\\to\\your\\STM32Cube_FW_U5_V1.8.0"');
        return;
    }
    
    // Test the logic
    try {
        // Step 1: Analyze package
        console.log('\n=== STEP 1: Analyze Package ===');
        const packageInfo = await packageManager.analyzePackage(packagePath);
        console.log('Package Info:', packageInfo);
        
        // Step 2: Get boards
        console.log('\n=== STEP 2: Get Available Boards ===');
        const boards = await packageManager.getAvailableBoards(packagePath);
        console.log(`\n📊 SUMMARY: Found ${boards.length} boards:`);
        boards.forEach((board, index) => {
            console.log(`${index + 1}. ${board.id} -> "${board.name}"`);
        });
        
        if (boards.length === 0) {
            console.log('\n❌ NO BOARDS FOUND! This explains why your extension shows "No boards found"');
        } else {
            console.log('\n✅ Boards detected successfully! The extension should work.');
        }
        
    } catch (error) {
        console.error('\n❌ Error during testing:', error);
    }
}

// Run with command line argument if provided, otherwise test common locations
const customPath = process.argv[2];
if (customPath) {
    console.log(`🎯 Testing with provided path: ${customPath}\n`);
    const packageManager = new PackageManager();
    
    packageManager.analyzePackage(customPath)
        .then(packageInfo => {
            console.log('Package Info:', packageInfo);
            return packageManager.getAvailableBoards(customPath);
        })
        .then(boards => {
            console.log(`\n📊 Found ${boards.length} boards:`);
            boards.forEach(board => console.log(`- ${board.id} -> "${board.name}"`));
        })
        .catch(console.error);
} else {
    testExtensionLogic();
} 