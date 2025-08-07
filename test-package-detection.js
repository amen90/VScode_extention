const fs = require('fs-extra');
const path = require('path');

// Simulate the corrected package detection logic
async function testPackageDetection() {
    console.log('🧪 Testing STM32Cube Package Detection Logic\n');
    
    // Test with a simulated package structure
    const testPackagePath = './test-stm32-package';
    
    // Create a test package structure
    await createTestPackageStructure(testPackagePath);
    
    // Test the detection logic
    await testBoardDetection(testPackagePath);
    
    // Clean up
    await fs.remove(testPackagePath);
}

async function createTestPackageStructure(packagePath) {
    console.log('📁 Creating test STM32Cube package structure...\n');
    
    const structure = {
        'Projects': {
            'NUCLEO-U575ZI-Q': {
                'Examples': {
                    'GPIO': {
                        'GPIO_EXTI': {
                            'main.c': '// GPIO EXTI example',
                            'Makefile': 'all:\n\tgcc main.c'
                        },
                        'GPIO_IOToggle': {
                            'main.c': '// GPIO toggle example',
                            'project.uvprojx': '<?xml version="1.0"?>'
                        }
                    },
                    'UART': {
                        'UART_Printf': {
                            'main.c': '// UART printf example',
                            'main.h': '#define STM32U575xx'
                        }
                    }
                },
                'Applications': {
                    'FreeRTOS': {
                        'FreeRTOS_Queues': {
                            'main.c': '// FreeRTOS queues',
                            'project.ioc': 'STM32CubeMX project'
                        }
                    }
                }
            },
            'STM32U575I-EV': {
                'Examples': {
                    'BSP': {
                        'main.c': '// BSP example'
                    }
                }
            },
            'B-U585I-IOT02A': {
                'Examples': {
                    'WiFi': {
                        'main.c': '// WiFi example'
                    }
                },
                'Applications': {
                    'Azure': {
                        'main.c': '// Azure IoT'
                    }
                }
            }
        },
        'package.xml': '<?xml version="1.0"?><package name="STM32Cube_FW_U5" version="1.3.0"/>'
    };
    
    await createDirectoryStructure(packagePath, structure);
    console.log('✅ Test package structure created\n');
}

async function createDirectoryStructure(basePath, structure) {
    await fs.ensureDir(basePath);
    
    for (const [name, content] of Object.entries(structure)) {
        const itemPath = path.join(basePath, name);
        
        if (typeof content === 'string') {
            // It's a file
            await fs.writeFile(itemPath, content);
        } else {
            // It's a directory
            await createDirectoryStructure(itemPath, content);
        }
    }
}

async function testBoardDetection(packagePath) {
    console.log('🎯 Testing board detection...\n');
    
    const projectsPath = path.join(packagePath, 'Projects');
    
    if (await fs.pathExists(projectsPath)) {
        console.log('✅ Projects directory found');
        
        const entries = await fs.readdir(projectsPath, { withFileTypes: true });
        const boardDirs = entries.filter(entry => entry.isDirectory());
        
        console.log(`📋 Found ${boardDirs.length} potential board directories:`);
        
        for (const boardDir of boardDirs) {
            console.log(`\n🔍 Analyzing board: ${boardDir.name}`);
            
            const boardPath = path.join(projectsPath, boardDir.name);
            const isValidBoard = await testBoardDirectory(boardPath);
            
            if (isValidBoard) {
                console.log(`  ✅ Valid STM32 board: ${boardDir.name}`);
                await testProjectDetection(boardPath, boardDir.name);
            } else {
                console.log(`  ❌ Invalid board directory: ${boardDir.name}`);
            }
        }
    } else {
        console.log('❌ Projects directory not found');
    }
}

async function testBoardDirectory(boardPath) {
    try {
        const entries = await fs.readdir(boardPath, { withFileTypes: true });
        const categoryDirs = entries.filter(entry => 
            entry.isDirectory() && 
            ['Examples', 'Applications', 'Demonstrations', 'Templates'].includes(entry.name)
        );
        
        console.log(`    Found categories: ${categoryDirs.map(d => d.name).join(', ')}`);
        
        return categoryDirs.length > 0;
    } catch (error) {
        return false;
    }
}

async function testProjectDetection(boardPath, boardName) {
    console.log(`  🔍 Detecting projects for ${boardName}:`);
    
    const categories = ['Examples', 'Applications', 'Demonstrations', 'Templates'];
    let totalProjects = 0;
    
    for (const category of categories) {
        const categoryPath = path.join(boardPath, category);
        if (await fs.pathExists(categoryPath)) {
            const projects = await getProjectsInCategory(categoryPath);
            console.log(`    ${category}: ${projects.length} projects`);
            projects.forEach(project => console.log(`      - ${project}`));
            totalProjects += projects.length;
        }
    }
    
    console.log(`  📊 Total projects: ${totalProjects}`);
}

async function getProjectsInCategory(categoryPath) {
    try {
        const entries = await fs.readdir(categoryPath, { withFileTypes: true });
        return entries.filter(entry => entry.isDirectory()).map(entry => entry.name);
    } catch (error) {
        return [];
    }
}

// Run the test
testPackageDetection().catch(console.error); 