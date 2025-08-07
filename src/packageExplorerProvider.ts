import * as vscode from 'vscode';
import * as path from 'path';

export class PackageExplorerProvider implements vscode.TreeDataProvider<PackageItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<PackageItem | undefined | null | void> = new vscode.EventEmitter<PackageItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<PackageItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(private context: vscode.ExtensionContext) {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: PackageItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: PackageItem): Thenable<PackageItem[]> {
        if (!element) {
            return Promise.resolve(this.getRootItems());
        }
        return Promise.resolve([]);
    }

    private getRootItems(): PackageItem[] {
        return [
            new PackageItem(
                'Import STM32 Package',
                'Import a new STM32 package from your filesystem',
                vscode.TreeItemCollapsibleState.None,
                {
                    command: 'stm32PackageManager.importPackage',
                    title: 'Import Package'
                }
            ),
            new PackageItem(
                'Open Package Manager',
                'Open the STM32 Package Manager interface',
                vscode.TreeItemCollapsibleState.None,
                {
                    command: 'stm32PackageManager.openPackageManager',
                    title: 'Open Package Manager'
                }
            )
        ];
    }
}

export class PackageItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly tooltip: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly command?: vscode.Command
    ) {
        super(label, collapsibleState);
        this.tooltip = tooltip;
        this.description = '';
        
        if (label.includes('Import')) {
            this.iconPath = new vscode.ThemeIcon('folder-opened');
        } else {
            this.iconPath = new vscode.ThemeIcon('package');
        }
    }
} 