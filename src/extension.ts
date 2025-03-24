import * as vscode from 'vscode';

import { ClarityAIAgentViewProvider } from './core/ClarityAIAgentViewProvider';

export function activate(context: vscode.ExtensionContext) {
    const provider = new ClarityAIAgentViewProvider(context.extensionUri);
    
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('clarityExplorerView', provider)
    );
    
    context.subscriptions.push(
        vscode.commands.registerCommand('clarityExplorer.showBuilder', () => {
            provider.showSection('builder');
        }),
        vscode.commands.registerCommand('clarityExplorer.showTesting', () => {
            provider.showSection('testing');
        }),
        vscode.commands.registerCommand('clarityExplorer.showDeployment', () => {
            provider.showSection('deployment');
        })
    );
}

export function deactivate() {}
