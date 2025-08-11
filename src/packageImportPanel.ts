import * as vscode from 'vscode';
import * as path from 'path';
import { PackageManager } from './packageManager';

export class PackageImportPanel {
    public static currentPanel: PackageImportPanel | undefined;
    public static readonly viewType = 'packageImport';

    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];
    private _packageManager: PackageManager;

    public static createOrShow(extensionUri: vscode.Uri) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (PackageImportPanel.currentPanel) {
            PackageImportPanel.currentPanel._panel.reveal(column);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            PackageImportPanel.viewType,
            'Import STM32 Package',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(extensionUri, 'media'),
                    vscode.Uri.joinPath(extensionUri, 'out')
                ]
            }
        );

        PackageImportPanel.currentPanel = new PackageImportPanel(panel, extensionUri);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._packageManager = new PackageManager();

        this._update();
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        this._panel.webview.onDidReceiveMessage(
            message => this._handleMessage(message),
            null,
            this._disposables
        );
    }

    private async _handleMessage(message: any) {
        switch (message.command) {
            case 'selectPackage':
                await this._selectPackage();
                break;
            case 'selectBoard':
                await this._selectBoard(message.packagePath);
                break;
            case 'selectProject':
                await this._selectProject(message.packagePath, message.boardId);
                break;
            case 'browseLocation':
                await this._browseLocation();
                break;
            case 'importProject':
                await this._importProject(
                    message.packagePath,
                    message.boardId,
                    message.projectName,
                    message.location,
                    message.targetName,
                    message.projectPath
                );
                break;
        }
    }

    private async _selectPackage() {
        const options: vscode.OpenDialogOptions = {
            canSelectMany: false,
            canSelectFiles: false,
            canSelectFolders: true,
            openLabel: 'Select STM32 Package Folder'
        };

        const folderUri = await vscode.window.showOpenDialog(options);
        if (folderUri && folderUri[0]) {
            console.log(`Selected package folder: ${folderUri[0].fsPath}`);
            try {
                const packageInfo = await this._packageManager.analyzePackage(folderUri[0].fsPath);
                console.log(`Package analysis complete:`, packageInfo);
                console.log('About to trigger board loading...');
                
                this._panel.webview.postMessage({
                    command: 'packageSelected',
                    packageInfo: packageInfo
                });
                
                // Automatically trigger board loading
                console.log('Triggering board loading...');
                await this._selectBoard(packageInfo.path);
            } catch (error) {
                console.error('Error analyzing package:', error);
                vscode.window.showErrorMessage(`Failed to analyze package: ${error}`);
            }
        }
    }

    private async _selectBoard(packagePath: string) {
        console.log(`Loading boards from: ${packagePath}`);
        try {
            const boards = await this._packageManager.getAvailableBoards(packagePath);
            console.log(`Found ${boards.length} boards:`, boards.map(b => b.name));
            console.log('Sending boards to webview...');
            
            this._panel.webview.postMessage({
                command: 'boardsLoaded',
                boards: boards
            });
        } catch (error) {
            console.error('Error loading boards:', error);
            vscode.window.showErrorMessage(`Failed to load boards: ${error}`);
        }
    }

    private async _selectProject(packagePath: string, boardId: string) {
        const projects = await this._packageManager.getProjectsForBoard(packagePath, boardId);
        this._panel.webview.postMessage({
            command: 'projectsLoaded',
            projects: projects
        });
    }

    private async _importProject(
        packagePath: string,
        boardId: string,
        projectName: string,
        location?: string,
        targetName?: string,
        projectPath?: string
    ) {
        try {
            const workspacePath = await this._packageManager.importProject(
                packagePath,
                boardId,
                projectName,
                location,
                targetName,
                projectPath
            );
            vscode.window.showInformationMessage(`Project imported successfully to: ${workspacePath}`);
            
            // Ask if user wants to open the project
            const openProject = await vscode.window.showInformationMessage(
                'Project imported successfully. Would you like to open it?',
                'Open Project',
                'Not Now'
            );

            if (openProject === 'Open Project') {
                const uri = vscode.Uri.file(workspacePath);
                await vscode.commands.executeCommand('vscode.openFolder', uri);
            }

            // Notify webview the import is complete
            this._panel.webview.postMessage({
                command: 'importComplete',
                success: true,
                message: 'Import finished'
            });
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to import project: ${error}`);
            this._panel.webview.postMessage({
                command: 'importComplete',
                success: false,
                message: String(error)
            });
        }
    }

    private async _browseLocation() {
        const options: vscode.OpenDialogOptions = {
            canSelectMany: false,
            canSelectFiles: false,
            canSelectFolders: true,
            openLabel: 'Select Import Location'
        };
        const folderUri = await vscode.window.showOpenDialog(options);
        const path = folderUri && folderUri[0] ? folderUri[0].fsPath : '';
        this._panel.webview.postMessage({ command: 'locationSelected', path });
    }

    private _update() {
        const webview = this._panel.webview;
        this._panel.title = 'Import STM32 Package';
        this._panel.webview.html = this._getHtmlForWebview(webview);
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'media', 'main.js')
        );
        const styleUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'media', 'main.css')
        );

        const nonce = getNonce();

        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <link href="${styleUri}" rel="stylesheet">
                <title>Import STM32 Package</title>
            </head>
            <body>
                <div class="container">
                    <h1>Import Example from Repository</h1>
                    
                    <div class="form-group">
                        <label for="repository">Repository:</label>
                        <div class="input-group">
                            <select id="repository" class="form-control">
                                <option value="">Select...</option>
                            </select>
                            <button id="selectPackageBtn" class="btn btn-primary">Browse...</button>
                        </div>
                        <div id="repositoryError" class="error-message" style="display: none;">
                            Error: Please select a repository
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="toolchain">Toolchain:</label>
                        <select id="toolchain" class="form-control" disabled>
                            <option value="">No toolchain selected</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="board">Board:</label>
                        <select id="board" class="form-control" disabled>
                            <option value="">No repository selected</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="template">Template:</label>
                        <select id="template" class="form-control" disabled>
                            <option value="">No board selected</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="projectName">Name:</label>
                        <input type="text" id="projectName" class="form-control" placeholder="Enter the application name">
                    </div>

                    <div class="form-group">
                        <label for="location">Location:</label>
                        <div class="input-group">
                            <input type="text" id="location" class="form-control" placeholder="Select location" readonly>
                            <button id="browseLocationBtn" class="btn btn-secondary">Browse...</button>
                        </div>
                    </div>

                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="openReadme"> Open readme file after project is imported
                        </label>
                    </div>

                    <div class="board-preview" id="boardPreview" style="display: none;">
                        <h3>Board Preview</h3>
                        <img id="boardImage" src="" alt="Board Image" style="max-width: 300px; max-height: 200px;">
                        <p id="boardDescription"></p>
                    </div>

                    <div class="form-actions">
                        <button id="importBtn" class="btn btn-primary" disabled>Import</button>
                    </div>
                </div>

                <script nonce="${nonce}" src="${scriptUri}"></script>
            </body>
            </html>`;
    }

    public dispose() {
        PackageImportPanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }
}

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
} 