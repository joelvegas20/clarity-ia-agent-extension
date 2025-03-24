export class DeploymentService {
    private vscode: any;

    constructor(vscode: any) {
        this.vscode = vscode;
    }

    init() {
        const deployButton = document.getElementById('deploy-button');
        if (!deployButton) return;

        deployButton.addEventListener('click', () => {
            const mnemonicInput = document.getElementById('mnemonic-input') as HTMLInputElement;
            const networkSelector = document.getElementById('network-selector') as HTMLSelectElement;

            const mnemonic = mnemonicInput?.value.trim() || '';
            const network = networkSelector?.value || 'testnet';

            const logPre = document.getElementById('code-preview');
            if (logPre) {
                logPre.textContent = '[INFO] Starting Clarinet deployments process...';
            }

            this.vscode.postMessage({
                command: 'startDeployment',
                mnemonic,
                network
            });
        });
    }

    appendLog(line: string) {
        const logPre = document.getElementById('code-preview');
        if (logPre) {
            logPre.textContent += '\n' + line;
            logPre.scrollTop = logPre.scrollHeight;
        }
    }
}