import * as vscode from 'vscode';
import { PackageImportPanel } from './packageImportPanel';
import { PackageExplorerProvider } from './packageExplorerProvider';

export function activate(context: vscode.ExtensionContext) {
    console.log('STM32 Package Manager extension is now active!');

    // Register the package explorer provider
    const packageExplorerProvider = new PackageExplorerProvider(context);
    vscode.window.registerTreeDataProvider('stm32PackageExplorer', packageExplorerProvider);

    // Register commands
    const importPackageCommand = vscode.commands.registerCommand(
        'stm32PackageManager.importPackage',
        () => {
            PackageImportPanel.createOrShow(context.extensionUri);
        }
    );

    const openPackageManagerCommand = vscode.commands.registerCommand(
        'stm32PackageManager.openPackageManager',
        () => {
            PackageImportPanel.createOrShow(context.extensionUri);
        }
    );

    context.subscriptions.push(importPackageCommand, openPackageManagerCommand);
}

export function deactivate() {} 