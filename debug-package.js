const fs = require('fs-extra');
const path = require('path');

async function analyzePackage(packagePath) {
    console.log(`\n=== Analyzing STM32 Package Structure ===`);
    console.log(`Package Path: ${packagePath}`);
    
    try {
        // Check if path exists
        if (!await fs.pathExists(packagePath)) {
            console.log(`❌ Package path does not exist: ${packagePath}`);
            return;
        }
        
        // List root directories
        console.log(`\n📁 Root directories:`);
        const rootEntries = await fs.readdir(packagePath, { withFileTypes: true });
        const rootDirs = rootEntries.filter(entry => entry.isDirectory()).map(entry => entry.name);
        rootDirs.forEach(dir => console.log(`  - ${dir}`));
        
        // Check common STM32 directories
        const commonDirs = ['Projects', 'Examples', 'Applications', 'Boards'];
        console.log(`\n🔍 Checking common STM32 directories:`);
        
        for (const dir of commonDirs) {
            const dirPath = path.join(packagePath, dir);
            const exists = await fs.pathExists(dirPath);
            console.log(`  ${exists ? '✅' : '❌'} ${dir}`);
            
            if (exists) {
                try {
                    const entries = await fs.readdir(dirPath, { withFileTypes: true });
                    const subdirs = entries.filter(entry => entry.isDirectory()).map(entry => entry.name);
                    console.log(`    Subdirectories (${subdirs.length}): ${subdirs.slice(0, 5).join(', ')}${subdirs.length > 5 ? '...' : ''}`);
                } catch (error) {
                    console.log(`    Error reading directory: ${error.message}`);
                }
            }
        }
        
        // Look for board-like directories in Projects
        const projectsPath = path.join(packagePath, 'Projects');
        if (await fs.pathExists(projectsPath)) {
            console.log(`\n🎯 Analyzing Projects directory:`);
            const projectEntries = await fs.readdir(projectsPath, { withFileTypes: true });
            const boardDirs = projectEntries.filter(entry => entry.isDirectory());
            
            console.log(`Found ${boardDirs.length} potential board directories:`);
            for (const boardDir of boardDirs.slice(0, 10)) { // Show first 10
                const boardPath = path.join(projectsPath, boardDir.name);
                const projectEntries = await fs.readdir(boardPath, { withFileTypes: true });
                const projectDirs = projectEntries.filter(entry => entry.isDirectory());
                console.log(`  📋 ${boardDir.name} (${projectDirs.length} projects): ${projectDirs.map(p => p.name).slice(0, 3).join(', ')}${projectDirs.length > 3 ? '...' : ''}`);
            }
        }
        
    } catch (error) {
        console.error(`❌ Error analyzing package: ${error.message}`);
    }
}

// Example usage - replace with your actual package path
const packagePath = process.argv[2] || "C:/Users/amen/Downloads/stm32cubeu5-v1-8-0/STM32Cube_FW_U5_V1.8.0";
analyzePackage(packagePath); 