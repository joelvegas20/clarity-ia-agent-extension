export class BuilderService {
    private vscode: any;
    private loadedContracts: any[];

    constructor(vscode: any, loadedContracts: any[]) {
        this.vscode = vscode;
        this.loadedContracts = loadedContracts;
    }

    init() {
        const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
        const button = document.getElementById('generate-contracts-btn') as HTMLButtonElement;

        const autoResize = () => {
            textarea.style.height = 'auto';
            textarea.style.height = textarea.scrollHeight + 'px';
        };

        const toggleButton = () => {
            const isEmpty = textarea.value.trim() === '';
            button.disabled = isEmpty;
            button.classList.toggle('opacity-50', isEmpty);
            button.classList.toggle('cursor-not-allowed', isEmpty);
        };

        textarea.addEventListener('input', () => {
            autoResize();
            toggleButton();
        });

        autoResize();
        toggleButton();

        button.addEventListener('click', () => {
            if (!this.loadedContracts.length) return;

            button.disabled = true;
            button.innerHTML = `
                <div class="flex items-center justify-center">
                    <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Loading...
                </div>
            `;

            setTimeout(() => {
                this.vscode.postMessage({
                    command: 'generateContracts',
                    contracts: this.loadedContracts
                });
            }, 4000);
        });
    }

    handleContractsGenerated(results: any[]) {
        const resultsContainer = document.getElementById('generation-results');
        const resultsList = document.getElementById('results-list');
        const codePreview = document.getElementById('code-preview');
        const previewContainer = document.getElementById('code-preview-container');

        if (resultsContainer && resultsList) {
            resultsList.innerHTML = '';
            let logOutput = '// Contract generation results:\n';

            results.forEach(result => {
                const resultItem = document.createElement('div');
                resultItem.className = `p-2 mb-2 border-l-4 ${result.success ? 'border-green-500' : 'border-red-500'}`;
                resultItem.innerHTML = `<strong>${result.name}</strong>: ${result.success ? 'Created successfully' : `Failed: ${result.error}`}`;
                resultsList.appendChild(resultItem);
                logOutput += `// ${result.success ? '✓' : '✗'} ${result.name}: ${result.success ? 'Created successfully' : result.error}\n`;
            });

            resultsContainer.style.display = 'block';

            if (previewContainer) {
                previewContainer.classList.remove('hidden');
            }

            if (codePreview) {
                const successCount = results.filter(r => r.success).length;
                codePreview.textContent = logOutput + `\n// Generated ${successCount} out of ${results.length} contracts.`;
            }
        }
    }
}