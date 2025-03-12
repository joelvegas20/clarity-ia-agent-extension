// extension.ts
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export function activate(context: vscode.ExtensionContext) {
    // Registrar el proveedor de WebView para Clarity Explorer
    const provider = new ClarityExplorerViewProvider(context.extensionUri);
    
    // Registrar el proveedor para la vista de webview en la barra lateral
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('clarityExplorerView', provider)
    );
    
    // Registrar comandos para cambiar entre las diferentes secciones
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

class ClarityExplorerViewProvider implements vscode.WebviewViewProvider {
    private _view?: vscode.WebviewView;
    private _currentSection: string = 'builder';

    constructor(private readonly _extensionUri: vscode.Uri) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        this._view = webviewView;

        // Configurar opciones del WebView
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        // Inicializar el WebView con el HTML
        this._updateWebview();

        // Escuchar mensajes del WebView
        webviewView.webview.onDidReceiveMessage(message => {
            switch (message.command) {
                case 'switchSection':
                    this.showSection(message.section);
                    break;
            }
        });
    }

    // Método para cambiar la sección activa
    public showSection(section: string) {
        this._currentSection = section;
        if (this._view) {
            this._updateWebview();
            this._view.webview.postMessage({ command: 'sectionChanged', section });
        }
    }

    private _updateWebview() {
        if (!this._view) {
            return;
        }

        this._view.webview.html = this._getHtmlForWebview();
    }

    private _getHtmlForWebview() {
        if (!this._view) {
            return '';
        }
        
        // Crear rutas para los recursos
        const scriptUri = this._view.webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'media', 'main.js')
        );
        const styleUri = this._view.webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'media', 'styles.css')
        );
        
        // Leer el archivo HTML principal
        const indexPath = vscode.Uri.joinPath(this._extensionUri, 'media', 'index.html');
        let htmlContent = fs.readFileSync(indexPath.fsPath, 'utf8');
        
        // Obtener el contenido de la sección actual
        const sectionContent = this._getContentForCurrentSection();
        
        // Reemplazar las referencias a los recursos
        htmlContent = htmlContent.replace('styles.css', styleUri.toString());
        htmlContent = htmlContent.replace('script.js', scriptUri.toString());
        
        // Reemplazar el div de contenido de sección con el contenido dinámico
        // Si tu HTML no tiene este div, necesitarás añadirlo como se explicó antes
        htmlContent = htmlContent.replace('<div id="section-content"></div>', 
                                         `<div id="section-content">${sectionContent}</div>`);
        
        return htmlContent;
    }

    private _getContentForCurrentSection() {
        // Leer el archivo HTML de la sección actual
        const sectionFileName = `${this._currentSection}.html`;

        const sectionPath = vscode.Uri.joinPath(this._extensionUri, 'media', sectionFileName);
        
        try {
            return fs.readFileSync(sectionPath.fsPath, 'utf8');
        } catch (error) {
            return `<div class="default-container">
                <h2>Section not found: ${this._currentSection}</h2>
            </div>`;
        }
    }
}

export function deactivate() {}