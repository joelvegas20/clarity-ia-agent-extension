import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as child_process from 'child_process';

// IMPORTS PARA DERIVAR LA PRIVATE KEY
import * as bip39 from 'bip39';
import * as HDKey from 'hdkey';
// import * as c32 from 'c32check'; // Útil si quieres también derivar dirección Stacks

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

export function deactivate() {}

// Proveedor de la vista web
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

        // Permitir scripts y recursos locales en el WebView
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        // Configurar el contenido inicial del WebView
        this._updateWebview();

        // Escuchar los mensajes que vienen del WebView
        webviewView.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case 'switchSection':
                    this.showSection(message.section);
                    break;

                case 'startDeployment':
                    // Recibimos un mnemonic y la red
                    await this._deployWithMnemonic(message.mnemonic, message.network);
                    break;
            }
        });
    }

    /**
     * Método principal para:
     *  1) Ejecutar `clarinet deployments generate`
     *  2) Derivar una private key desde el mnemonic
     *  3) Aplicar el plan con `clarinet deployments apply`
     */
    private async _deployWithMnemonic(mnemonic: string, network: string) {
        if (!this._view) return;

        // Verificar si estamos en un proyecto Clarity
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            this._sendErrorMessage('No workspace folder is open. Please open a Clarity project.');
            return;
        }
        const projectRoot = workspaceFolders[0].uri.fsPath;

        // Verificar que es un proyecto Clarity válido (existe Clarinet.toml)
        const clarinetConfig = path.join(projectRoot, 'Clarinet.toml');
        if (!fs.existsSync(clarinetConfig)) {
            this._sendErrorMessage('Current workspace is not a valid Clarity project. Clarinet.toml not found.');
            return;
        }

        try {
            // 1) Generar plan de despliegue
            await this._runCommand(`clarinet deployments generate --${network} --low-cost`, projectRoot);

            // 2) Derivar la private key a partir del mnemonic
            const privateKey = await this._derivePrivateKey(mnemonic);
            this._sendLogMessage(`Derived private key (hex) => ${privateKey.slice(0, 10)}...`);

            // 3) Crear archivo temporal con la private key
            // const tempKeyFile = path.join(projectRoot, '.temp-key-file');
            // fs.writeFileSync(tempKeyFile, privateKey, { mode: 0o600 });

            // 4) Aplicar el plan: `clarinet deployments apply --<network> --key-file .temp-key-file`
            const applyCmd = `clarinet deployments apply --${network} `;
            await this._runCommand(applyCmd, projectRoot);

            // 5) Eliminar archivo temporal
            // fs.unlinkSync(tempKeyFile);

            // Notificar éxito
            this._view.webview.postMessage({ command: 'deploymentComplete' });
            vscode.window.showInformationMessage(`Successfully applied deployments to ${network}.`);

        } catch (error: any) {
            this._sendErrorMessage(`Deployment failed: ${error.message || error}`);
        }
    }

    /**
     * Corre un comando en la terminal y muestra sus logs en tiempo real
     */
    // Reemplaza el método _runCommand con esta versión modificada
private async _runCommand(command: string, cwd: string): Promise<void> {
    // Quitamos el "yes |" y usamos una mejor estrategia para respuestas automáticas
    this._sendLogMessage(`Running command: ${command}`);
    
    return new Promise((resolve, reject) => {
        // Ejecutamos sin el "yes |" prefijo
        const child = child_process.spawn(command, {
            cwd,
            shell: true,
            env: {
                ...process.env,
                // Añadimos esta variable para obtener más información en caso de error
                RUST_BACKTRACE: "1"
            }
        });

        // Manejamos la entrada estándar para responder automáticamente si es necesario
        if (child.stdin) {
            child.stdin.on('error', (err) => {
                this._sendLogMessage(`STDIN error: ${err.message}`);
            });
        }

        child.stdout?.on('data', (data) => {
            const output = data.toString().trimEnd();
            this._sendLogMessage(output);
            
            // Si detectamos una pregunta de confirmación, respondemos automáticamente
            if (output.toLowerCase().includes('y/n') || output.toLowerCase().includes('[y/n]')) {
                if (child.stdin) {
                    child.stdin.write('y\n');
                    this._sendLogMessage("Automatically responded 'y' to prompt");
                }
            }
        });
        
        child.stderr?.on('data', (data) => {
            this._sendLogMessage(`ERROR: ${data.toString().trimEnd()}`);
        });
        
        child.on('close', (code) => {
            if (code === 0) {
                this._sendLogMessage(`Command finished OK: ${command}`);
                resolve();
            } else {
                const errMsg = `Command "${command}" failed with exit code ${code}.`;
                this._sendLogMessage(errMsg);
                reject(new Error(errMsg));
            }
        });
    });
    }

    /**
     * Deriva la private key (hex) desde un mnemonic BIP39 (ruta para Stacks: m/44'/5757'/0'/0/0)
     */
    private async _derivePrivateKey(mnemonic: string): Promise<string> {
        // Validar
        // if (!bip39.validateMnemonic(mnemonic)) {
        //     throw new Error('Invalid seed phrase (mnemonic).');
        // }

        // Derivar semilla
        const seed = await bip39.mnemonicToSeed(mnemonic);

        // Generar HD master key
        const root = HDKey.fromMasterSeed(seed);

        // Derivar la clave para la ruta de Stacks (m/44'/5757'/0'/0/0)
        const child = root.derive("m/44'/5757'/0'/0/0");

        // Retornar en hex (sin 0x)
        return child.privateKey.toString('hex');
    }

    // -------------------------------------
    // Métodos para manejar la vista WebView
    // -------------------------------------

    /**
     * Cambia la sección activa (builder, testing, deployment, etc.)
     */
    public showSection(section: string) {
        this._currentSection = section;
        if (this._view) {
            this._updateWebview();
            this._view.webview.postMessage({ command: 'sectionChanged', section });
        }
    }

    /**
     * Reemplaza el HTML de la vista con el de la sección actual
     */
    private _updateWebview() {
        if (!this._view) {
            return;
        }
        this._view.webview.html = this._getHtmlForWebview();
    }

    /**
     * Construye el HTML inyectado en el WebView, incluyendo scripts y estilos
     */
    private _getHtmlForWebview() {
        if (!this._view) {
            return '';
        }
        
        const scriptUri = this._view.webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'media', 'main.js')
        );
        const styleUri = this._view.webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'media', 'styles.css')
        );

        // Cargar index.html
        const indexPath = vscode.Uri.joinPath(this._extensionUri, 'media', 'index.html');
        let htmlContent = fs.readFileSync(indexPath.fsPath, 'utf8');
        
        // Obtener el contenido HTML específico de la sección
        const sectionContent = this._getContentForCurrentSection();

        // Reemplazar referencias a CSS y JS
        htmlContent = htmlContent.replace('styles.css', styleUri.toString());
        htmlContent = htmlContent.replace('script.js', scriptUri.toString());

        // Inyectar el contenido de la sección
        htmlContent = htmlContent.replace(
            '<div id="section-content"></div>',
            `<div id="section-content">${sectionContent}</div>`
        );

        return htmlContent;
    }

    /**
     * Lee el HTML de la sección actual (p.ej. "deployment.html")
     */
    private _getContentForCurrentSection() {
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

    /**
     * Envía un log normal al WebView
     */
    private _sendLogMessage(log: string) {
        if (this._view) {
            this._view.webview.postMessage({ command: 'deploymentLog', log });
        }
    }

    /**
     * Envía un error al WebView y muestra un mensaje en VSCode
     */
    private _sendErrorMessage(error: string) {
        if (this._view) {
            this._view.webview.postMessage({ command: 'deploymentError', error });
            vscode.window.showErrorMessage(error);
        }
    }


    // Show temporal message 
    private _showMessage(message: string) {
        if (this._view) {
            this._view.webview.postMessage({ command: 'showMessage', message });
            vscode.window.showInformationMessage(message);
        }
    }
}