import * as child_process from 'child_process';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export class ClarityAIAgentViewProvider implements vscode.WebviewViewProvider {
    private _view?: vscode.WebviewView;
    private _currentSection: string = 'builder';

    constructor(private readonly _extensionUri: vscode.Uri) { }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                this._extensionUri,
                vscode.Uri.parse('https://cdnjs.cloudflare.com/') // Allow loading Prism.js from CDN
            ]
        };

        this._updateWebview();

        this._sendDataJsonToWebview();

        webviewView.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case 'switchSection':
                    this.showSection(message.section);
                    break;

                case 'startDeployment':
                    await this._deployWithMnemonic(message.mnemonic, message.network);
                    break;
                case 'generateContracts':
                    await this._handleContractGeneration(message.prompt);
                    break;
            }
        });
    }

    private async _deployWithMnemonic(mnemonic: string, network: string) {
        if (!this._view) return;

        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            this._sendErrorMessage('No workspace folder is open. Please open a Clarity project.');
            return;
        }
        const projectRoot = workspaceFolders[0].uri.fsPath;

        const clarinetConfig = path.join(projectRoot, 'Clarinet.toml');
        if (!fs.existsSync(clarinetConfig)) {
            this._sendErrorMessage('Current workspace is not a valid Clarity project. Clarinet.toml not found.');
            return;
        }

        try {
            await this._runCommand(`clarinet requirements add  SP2PABAF9FTAJYNFZH93XENAJ8FVY99RRM50D2JG9.nft-trait`, projectRoot);
            await this._runCommand(`clarinet deployments generate --${network} --low-cost`, projectRoot);

            const applyCmd = `clarinet deployments apply --${network} --no-dashboard`;
            await this._runCommand(applyCmd, projectRoot);

            this._view.webview.postMessage({ command: 'deploymentComplete' });
            vscode.window.showInformationMessage(`Successfully applied deployments to ${network}.`);

        } catch (error: any) {
            this._sendErrorMessage(`Deployment failed: ${error.message || error}`);
        }
    }
    
    private async _runCommand(command: string, cwd: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const child = child_process.spawn(command, {
                cwd,
                shell: true,
                env: {
                    ...process.env,
                    RUST_BACKTRACE: "full"
                }
            });

            if (child.stdin) {
                child.stdin.on('error', (err) => {
                    this._sendLogMessage(`STDIN error: ${err.message}`);
                });
            }

            child.stdout?.on('data', (data) => {
                const output = data.toString().trimEnd();
                this._sendLogMessage(output);
                if (output.toLowerCase().includes('y/n') || output.toLowerCase().includes('[y/n]')) {
                    if (child.stdin) {
                        child.stdin.write('y\n');
                        this._sendLogMessage("Automatically responded 'y' to prompt");
                    }
                }
            });

            child.stderr?.on('data', (data) => {
                const errorOutput = data.toString().trimEnd();
                this._sendLogMessage(`ERROR: ${errorOutput}`);
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

    private _sendDataJsonToWebview() {
        if (!this._view) return;

        const dataJsonPath = vscode.Uri.joinPath(this._extensionUri, 'media', 'data.json').fsPath;

        this._sendLogMessage(`🔍 Looking for data.json at: ${dataJsonPath}`);

        if (fs.existsSync(dataJsonPath)) {
            try {
                const jsonData = fs.readFileSync(dataJsonPath, 'utf8');
                const contracts = JSON.parse(jsonData);

                this._view.webview.postMessage({
                    command: 'loadContracts',
                    contracts: contracts
                });

                this._sendLogMessage("📄 data.json enviado al frontend correctamente.");
            } catch (error: any) {
                this._sendErrorMessage(`❌ Error leyendo data.json: ${error.message}`);
            }
        } else {
            this._sendErrorMessage("⚠️ No se encontró data.json.");

            try {
                const defaultData = JSON.stringify({ contracts: [] }, null, 2);
                const mediaDir = path.dirname(dataJsonPath);

                if (!fs.existsSync(mediaDir)) {
                    fs.mkdirSync(mediaDir, { recursive: true });
                }

                fs.writeFileSync(dataJsonPath, defaultData, 'utf8');
                this._sendLogMessage(`✅ Created default data.json at ${dataJsonPath}`);

                this._view.webview.postMessage({
                    command: 'loadContracts',
                    contracts: { contracts: [] }
                });
            } catch (error: any) {
                this._sendErrorMessage(`❌ Failed to create default data.json: ${error.message}`);
            }
        }
    }

    // private async _handleContractGeneration(contracts: any[]) {
    //     if (!this._view) return;
    
    //     const workspaceFolders = vscode.workspace.workspaceFolders;
    //     if (!workspaceFolders || workspaceFolders.length === 0) {
    //         this._sendErrorMessage('No workspace folder is open. Please open a Clarity project.');
    //         return;
    //     }
    //     const projectRoot = workspaceFolders[0].uri.fsPath;
    
    //     const contractsDir = path.join(projectRoot, 'contracts');
    //     if (!fs.existsSync(contractsDir)) {
    //         fs.mkdirSync(contractsDir, { recursive: true });
    //     }
    
    //     const results = [];
    
    //     for (const contract of contracts) {
    //         try {
    //             if (!contract.name || !contract.code) {
    //                 results.push({ name: contract.name || 'unnamed', success: false, error: 'Invalid contract format. Both name and code are required.' });
    //                 continue;
    //             }
    
    //             const contractName = contract.name.replace(/\s+/g, '-').toLowerCase();
    //             const fileName = `${contractName}.clar`;
    //             const filePath = path.join(contractsDir, fileName);
                
    //             const contractExists = fs.existsSync(filePath);
                
    //             if (!contractExists) {
    //                 try {
    //                     await this._runCommand(`clarinet contract new ${contractName}`, projectRoot);
    //                     this._sendLogMessage(`Created contract: ${contractName}`);
    //                 } catch (cmdError: any) {
    //                     results.push({ 
    //                         name: contract.name, 
    //                         success: false, 
    //                         error: `Failed to create contract: ${cmdError.message || String(cmdError)}` 
    //                     });
    //                     continue;
    //                 }
    //             }
            
    //             fs.writeFileSync(filePath, contract.code, 'utf8');
                
    //             results.push({ 
    //                 name: contract.name, 
    //                 path: filePath, 
    //                 success: true, 
    //                 action: contractExists ? 'updated' : 'created' 
    //             });
                
    //             this._sendLogMessage(`${contractExists ? 'Updated' : 'Created'} contract: ${fileName}`);
                
    //         } catch (error: any) {
    //             results.push({ 
    //                 name: contract.name || 'unnamed', 
    //                 success: false, 
    //                 error: error.message || String(error) 
    //             });
    //             this._sendLogMessage(`Failed to ${fs.existsSync(path.join(contractsDir, `${contract.name.replace(/\s+/g, '-').toLowerCase()}.clar`)) ? 'update' : 'create'} contract ${contract.name}: ${error.message || error}`);
    //         }
    //     }
    
    //     this._view.webview.postMessage({ command: 'contractsGenerated', results });
        
    //     const created = results.filter(r => r.success && r.action === 'created').length;
    //     const updated = results.filter(r => r.success && r.action === 'updated').length;
    //     const failed = results.filter(r => !r.success).length;
        
    //     vscode.window.showInformationMessage(
    //         `Processed ${contracts.length} contracts: ${created} created, ${updated} updated, ${failed} failed.`
    //     );
    
    //     if (results.some(r => r.success)) {
    //         vscode.commands.executeCommand('workbench.files.action.refreshFilesExplorer');
    //     }
    // }

    // private async _handleContractGeneration(prompt: string) {
    //     if (!this._view) return;
    
    //     const projectRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    //     if (!projectRoot) return this._sendErrorMessage('No workspace folder open.');
    
    //     const contractsDir = path.join(projectRoot, 'contracts');
    //     if (!fs.existsSync(contractsDir)) fs.mkdirSync(contractsDir, { recursive: true });
    
    //     this._sendErrorMessage('Prompt sent to Gemini AI: ' + prompt);
    //     try {
    //         const url = 'http://localhost:8000/api/ai/gemini';
    
    //         const response = await fetch(url, {
    //             method: 'POST',
    //             headers: { 'Content-Type': 'application/json' },
    //             body: JSON.stringify({ 
    //                 prompt: prompt,
    //               }),
    //         });
    
    //         // DEBUG: captura status + texto crudo
    //         const text = await response.text();
    //         this._sendLogMessage(`[DEBUG] Response status: ${response.status}`);
    //         this._sendLogMessage(`[DEBUG] Response body: ${text}`);
    
    //         if (!response.ok) {
    //             throw new Error(`Server returned ${response.status}: ${text}`);
    //         }
    
    //         const { name, code } = JSON.parse(text);
    //         if (!name || !code) throw new Error('Response missing “name” or “code” fields');
    
    //         const fileName = `${name.replace(/\s+/g, '-').toLowerCase()}.clar`;
    //         const filePath = path.join(contractsDir, fileName);
    //         fs.writeFileSync(filePath, code, 'utf8');
    
    //         this._view.webview.postMessage({
    //             command: 'contractsGenerated',
    //             results: [{ name, path: filePath, success: true, action: fs.existsSync(filePath) ? 'updated' : 'created' }]
    //         });
    
    //         vscode.window.showInformationMessage(`Contract saved as ${fileName}`);
    //         vscode.commands.executeCommand('workbench.files.action.refreshFilesExplorer');
    
    //     } catch (err: any) {
    //         this._sendErrorMessage(`Contract generation failed: ${err.message}`);
    //     }
    // }

    private async _handleContractGeneration(prompt: string) {
        if (!this._view) return;
    
        const projectRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!projectRoot) return this._sendErrorMessage('No workspace folder open.');
    
        const contractsDir = path.join(projectRoot, 'contracts');
        if (!fs.existsSync(contractsDir)) fs.mkdirSync(contractsDir, { recursive: true });
    
        try {
            this._sendLogMessage(`[INFO] Sending prompt to Gemini: ${prompt}`);
            const url = 'http://localhost:8000/api/ai/gemini';
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt }),
            });
    
            const text = await response.text();
            this._sendLogMessage(`[DEBUG] Status ${response.status}, Body: ${text}`);
            if (!response.ok) throw new Error(`Server returned ${response.status}: ${text}`);
    
            const { name, code } = JSON.parse(text);
            if (!name || !code) throw new Error('Response missing name or code');
    
            const contractName = name.replace(/\s+/g, '-').toLowerCase();
            const fileName = `${contractName}.clar`;
            const filePath = path.join(contractsDir, fileName);
            const exists = fs.existsSync(filePath);
    
            if (!exists) {
                await this._runCommand(`clarinet contract new ${contractName}`, projectRoot);
                this._sendLogMessage(`[INFO] clarinet contract new ${contractName}`);
            }
    
            fs.writeFileSync(filePath, code, 'utf8');
            const action = exists ? 'updated' : 'created';
    
            this._view.webview.postMessage({
                command: 'contractsGenerated',
                results: [{ name, path: filePath, success: true, action }]
            });
    
            vscode.window.showInformationMessage(`Contract ${action}: ${fileName}`);
            vscode.commands.executeCommand('workbench.files.action.refreshFilesExplorer');
    
        } catch (error: any) {
            this._sendErrorMessage(`Contract generation failed: ${error.message}`);
            this._view.webview.postMessage({
                command: 'contractsGenerated',
                results: [{ name: 'unknown', success: false, error: error.message }]
            });
        }
    }

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

        const scriptUri = this._view.webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'media', 'main.js')
        );
        const styleUri = this._view.webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'media', 'styles.css')
        );

        const indexPath = vscode.Uri.joinPath(this._extensionUri, 'media', 'index.html');
        let htmlContent = fs.readFileSync(indexPath.fsPath, 'utf8');

        const sectionContent = this._getContentForCurrentSection();

        htmlContent = htmlContent.replace('styles.css', styleUri.toString());
        htmlContent = htmlContent.replace('script.js', scriptUri.toString());

        // Add Prism.js CSS and JS links
        const prismCssUrl = this._view.webview.asWebviewUri(
            vscode.Uri.parse('https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-tomorrow.min.css')
        );
        const prismJsUrl = this._view.webview.asWebviewUri(
            vscode.Uri.parse('https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/prism.min.js')
        );
        const prismLispUrl = this._view.webview.asWebviewUri(
            vscode.Uri.parse('https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-lisp.min.js')
        );

        // Add Prism links to the head
        const headEndIndex = htmlContent.indexOf('</head>');
        if (headEndIndex !== -1) {
            const prismLinks = `
                <link rel="stylesheet" href="${prismCssUrl}">
                <script src="${prismJsUrl}"></script>
                <script src="${prismLispUrl}"></script>
            `;
            htmlContent = htmlContent.slice(0, headEndIndex) + prismLinks + htmlContent.slice(headEndIndex);
        }

        htmlContent = htmlContent.replace(
            '<div id="section-content"></div>',
            `<div id="section-content" class="flex w-full">${sectionContent}</div>`
        );

        return htmlContent;
    }

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

    // Modificación de la función _sendLogMessage
    private _sendLogMessage(log: string) {
        if (this._view) {
            // Verificar si el mensaje contiene un prefijo de tipo [INFO], [ERROR], etc.
            let formattedLog = log;
            
            // Formato para mensajes que comienzan con [INFO]
            if (log.startsWith('[INFO]')) {
                formattedLog = `<span class="log-entry"><span class="text-orange-50">[INFO]</span> <span class="log-message">${log.substring(6).trim()}</span></span>`;
            } 
            // Formato para mensajes que comienzan con [ERROR]
            else if (log.startsWith('[ERROR]')) {
                formattedLog = `<span class="log-entry"><span class="text-red-700">[ERROR]</span> <span class="log-message">${log.substring(7).trim()}</span></span>`;
            }
            // Si el mensaje no tiene prefijo, añadimos [INFO] como prefijo por defecto
            else {
                formattedLog = `<span class="log-entry"><span class="text-orange-500">[INFO]</span> <span class="log-message">${log}</span></span>`;
            }
            
            this._view.webview.postMessage({ command: 'deploymentLog', log: formattedLog });
        }
    }

    private _sendErrorMessage(error: string) {
        if (this._view) {
            const formattedError = `<span class="text-red-700"><span class="text-red-700">[ERROR]</span> <span class="log-message">${error}</span></span>`;
            this._view.webview.postMessage({ command: 'deploymentError', error: formattedError });
            vscode.window.showErrorMessage(error);
        }
    }

 
}