const fs = require('fs-extra');
const path = require('path');

async function findSTM32Packages() {
    console.log('🔍 Searching for STM32Cube packages...\n');
    
    const searchPaths = [
        'C:\\Users\\amen\\Documents',
        'C:\\Users\\amen',
        'C:\\STM32Cube',
        'C:\\ST',
        'C:\\',
        'D:\\'
    ];
    
    const packagePatterns = [
        'STM32Cube_FW_U5',
        'STM32CUBEU5',
        'STM32Cube',
        'STM32'
    ];
    
    for (const searchPath of searchPaths) {
        if (await fs.pathExists(searchPath)) {
            console.log(`📂 Searching in: ${searchPath}`);
            try {
                await searchDirectory(searchPath, packagePatterns, 0, 3); // Max depth 3
            } catch (error) {
                console.log(`  ❌ Error accessing ${searchPath}: ${error.message}`);
            }
        } else {
            console.log(`❌ Path not found: ${searchPath}`);
        }
    }
}

async function searchDirectory(dirPath, patterns, currentDepth, maxDepth) {
    if (currentDepth > maxDepth) return;
    
    try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        
        for (const entry of entries) {
            if (entry.isDirectory()) {
                const fullPath = path.join(dirPath, entry.name);
                
                // Check if this directory matches any pattern
                const matchesPattern = patterns.some(pattern => 
                    entry.name.toUpperCase().includes(pattern.toUpperCase())
                );
                
                if (matchesPattern) {
                    console.log(`  🎯 Found potential package: ${fullPath}`);
                    
                    // Check if it has a Projects directory
                    const projectsPath = path.join(fullPath, 'Projects');
                    if (await fs.pathExists(projectsPath)) {
                        console.log(`  ✅ VALID STM32Cube package found: ${fullPath}`);
                        console.log(`     (Contains Projects directory)`);
                        
                        // List boards
                        try {
                            const boardEntries = await fs.readdir(projectsPath, { withFileTypes: true });
                            const boards = boardEntries.filter(e => e.isDirectory()).map(e => e.name);
                            console.log(`     Boards: ${boards.slice(0, 5).join(', ')}${boards.length > 5 ? '...' : ''}`);
                        } catch (e) {
                            console.log(`     Could not list boards: ${e.message}`);
                        }
                        console.log('');
                    }
                }
                
                // Continue searching recursively (but skip some common directories)
                if (currentDepth < maxDepth && !shouldSkipDirectory(entry.name)) {
                    await searchDirectory(fullPath, patterns, currentDepth + 1, maxDepth);
                }
            }
        }
    } catch (error) {
        // Skip directories we can't access
    }
}

function shouldSkipDirectory(dirName) {
    const skipDirs = [
        'node_modules', '.git', '.vscode', 'System Volume Information',
        'Windows', 'Program Files', 'Program Files (x86)', 'ProgramData',
        'AppData', '$Recycle.Bin', 'Recovery'
    ];
    
    return skipDirs.some(skip => dirName.toLowerCase().includes(skip.toLowerCase()));
}

// Also provide a manual test function
async function testSpecificPath(testPath) {
    console.log(`\n🧪 Testing specific path: ${testPath}`);
    
    if (!await fs.pathExists(testPath)) {
        console.log(`❌ Path does not exist: ${testPath}`);
        return;
    }
    
    console.log(`✅ Path exists`);
    
    // Check for Projects directory
    const projectsPath = path.join(testPath, 'Projects');
    if (await fs.pathExists(projectsPath)) {
        console.log(`✅ Projects directory found`);
        
        // List boards
        const entries = await fs.readdir(projectsPath, { withFileTypes: true });
        const boards = entries.filter(e => e.isDirectory()).map(e => e.name);
        console.log(`📋 Found ${boards.length} potential boards:`);
        boards.forEach(board => console.log(`  - ${board}`));
        
        console.log(`\n🎯 Use this path in your extension: ${testPath}`);
    } else {
        console.log(`❌ No Projects directory found at ${projectsPath}`);
        
        // List what's actually there
        console.log(`📋 Contents of ${testPath}:`);
        const contents = await fs.readdir(testPath);
        contents.forEach(item => console.log(`  - ${item}`));
    }
}

// Main execution
const specificPath = process.argv[2];
if (specificPath) {
    testSpecificPath(specificPath);
} else {
    findSTM32Packages();
} 