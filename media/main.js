(function() {
    const vscode = acquireVsCodeApi();
    
    let currentPackageInfo = null;
    let currentBoards = [];
    let currentProjects = [];
    let selectedBoard = null;
    let selectedProject = null;

    // DOM elements
    const repositorySelect = document.getElementById('repository');
    const selectPackageBtn = document.getElementById('selectPackageBtn');
    const repositoryError = document.getElementById('repositoryError');
    const toolchainSelect = document.getElementById('toolchain');
    const boardSelect = document.getElementById('board');
    const templateSelect = document.getElementById('template');
    const projectNameInput = document.getElementById('projectName');
    const locationInput = document.getElementById('location');
    const browseLocationBtn = document.getElementById('browseLocationBtn');
    const openReadmeCheckbox = document.getElementById('openReadme');
    const importBtn = document.getElementById('importBtn');
    const boardPreview = document.getElementById('boardPreview');
    const boardImage = document.getElementById('boardImage');
    const boardDescription = document.getElementById('boardDescription');

    // Event listeners
    selectPackageBtn.addEventListener('click', () => {
        vscode.postMessage({ command: 'selectPackage' });
    });

    repositorySelect.addEventListener('change', (e) => {
        const selectedPackage = e.target.value;
        if (selectedPackage && currentPackageInfo) {
            repositoryError.style.display = 'none';
            vscode.postMessage({ 
                command: 'selectBoard', 
                packagePath: currentPackageInfo.path 
            });
        } else {
            repositoryError.style.display = 'block';
            resetBoardSelection();
        }
    });

    boardSelect.addEventListener('change', (e) => {
        const boardId = e.target.value;
        selectedBoard = currentBoards.find(b => b.id === boardId);
        
        if (selectedBoard) {
            showBoardPreview(selectedBoard);
            templateSelect.disabled = false;
            templateSelect.innerHTML = '<option value="">Loading projects...</option>';
            
            vscode.postMessage({ 
                command: 'selectProject', 
                packagePath: currentPackageInfo.path,
                boardId: boardId
            });
        } else {
            hideBoardPreview();
            templateSelect.disabled = true;
            templateSelect.innerHTML = '<option value="">No board selected</option>';
        }
        
        updateImportButton();
    });

    templateSelect.addEventListener('change', (e) => {
        const projectName = e.target.value;
        selectedProject = currentProjects.find(p => p.name === projectName);
        
        if (selectedProject && !projectNameInput.value) {
            projectNameInput.value = selectedProject.name;
        }
        
        updateImportButton();
    });

    projectNameInput.addEventListener('input', updateImportButton);
    locationInput.addEventListener('input', updateImportButton);

    browseLocationBtn.addEventListener('click', () => {
        // This would typically open a file dialog, but in webview we'll use a simple prompt
        const location = prompt('Enter the project location:', locationInput.value || '');
        if (location) {
            locationInput.value = location;
            updateImportButton();
        }
    });

    importBtn.addEventListener('click', () => {
        if (canImport()) {
            const projectName = projectNameInput.value.trim();
            
            vscode.postMessage({
                command: 'importProject',
                packagePath: currentPackageInfo.path,
                boardId: selectedBoard.id,
                projectName: selectedProject.name,
                targetName: projectName,
                location: locationInput.value,
                openReadme: openReadmeCheckbox.checked
            });
            
            // Disable button and show loading state
            importBtn.disabled = true;
            importBtn.textContent = 'Importing...';
            document.querySelector('.container').classList.add('loading');
        }
    });

    // Message handler
    window.addEventListener('message', event => {
        const message = event.data;
        
        switch (message.command) {
            case 'packageSelected':
                handlePackageSelected(message.packageInfo);
                break;
            case 'boardsLoaded':
                handleBoardsLoaded(message.boards);
                break;
            case 'projectsLoaded':
                handleProjectsLoaded(message.projects);
                break;
            case 'importComplete':
                handleImportComplete(message.success, message.message);
                break;
        }
    });

    function handlePackageSelected(packageInfo) {
        currentPackageInfo = packageInfo;
        
        // Update repository dropdown
        repositorySelect.innerHTML = '';
        const option = document.createElement('option');
        option.value = packageInfo.path;
        option.textContent = `${packageInfo.name} (${packageInfo.version})`;
        repositorySelect.appendChild(option);
        repositorySelect.value = packageInfo.path;
        
        repositoryError.style.display = 'none';
        
        // Enable toolchain selection (mock data for now)
        toolchainSelect.disabled = false;
        toolchainSelect.innerHTML = `
            <option value="gcc">GCC</option>
            <option value="keil">Keil</option>
            <option value="iar">IAR</option>
            <option value="cube">STM32CubeIDE</option>
        `;
        

    }

    function handleBoardsLoaded(boards) {
        console.log('Webview received boards:', boards);
        currentBoards = boards;
        
        boardSelect.disabled = false;
        boardSelect.innerHTML = '<option value="">Select a board...</option>';
        
        boards.forEach(board => {
            const option = document.createElement('option');
            option.value = board.id;
            option.textContent = board.name;
            boardSelect.appendChild(option);
        });
        
        if (boards.length === 0) {
            boardSelect.innerHTML = '<option value="">No boards found</option>';
        }
    }

    function handleProjectsLoaded(projects) {
        currentProjects = projects;
        
        templateSelect.innerHTML = '<option value="">Select a project template...</option>';
        
        projects.forEach(project => {
            const option = document.createElement('option');
            option.value = project.name;
            option.textContent = project.name;
            if (project.description) {
                option.title = project.description;
            }
            templateSelect.appendChild(option);
        });
        
        if (projects.length === 0) {
            templateSelect.innerHTML = '<option value="">No projects found for this board</option>';
        }
        
        updateImportButton();
    }

    function handleImportComplete(success, message) {
        // Reset UI state
        importBtn.disabled = false;
        importBtn.textContent = 'Import';
        document.querySelector('.container').classList.remove('loading');
        
        if (success) {
            // Reset form
            resetForm();
        }
    }

    function showBoardPreview(board) {
        boardPreview.style.display = 'block';
        boardDescription.textContent = board.description;
        
        if (board.imagePath) {
            boardImage.src = board.imagePath;
            boardImage.style.display = 'block';
        } else {
            boardImage.style.display = 'none';
        }
    }

    function hideBoardPreview() {
        boardPreview.style.display = 'none';
    }

    function resetBoardSelection() {
        selectedBoard = null;
        selectedProject = null;
        currentBoards = [];
        currentProjects = [];
        
        boardSelect.disabled = true;
        boardSelect.innerHTML = '<option value="">No repository selected</option>';
        
        templateSelect.disabled = true;
        templateSelect.innerHTML = '<option value="">No board selected</option>';
        
        hideBoardPreview();
        updateImportButton();
    }

    function resetForm() {
        currentPackageInfo = null;
        repositorySelect.innerHTML = '<option value="">Select...</option>';
        toolchainSelect.disabled = true;
        toolchainSelect.innerHTML = '<option value="">No toolchain selected</option>';
        projectNameInput.value = '';
        locationInput.value = '';
        openReadmeCheckbox.checked = false;
        resetBoardSelection();
    }

    function canImport() {
        return currentPackageInfo && 
               selectedBoard && 
               selectedProject && 
               projectNameInput.value.trim() !== '';
    }

    function updateImportButton() {
        importBtn.disabled = !canImport();
    }

    // Initialize
    updateImportButton();
    
    // Set default location
    locationInput.value = 'Select location';
})(); 