(function() {
    const vscode = acquireVsCodeApi();
    let loadedContracts = vscode.getState()?.loadedContracts || []; // 🔥 Restaurar contratos previos

    const sidebarItems = {
        builder: document.getElementById('builder-btn'),
        testing: document.getElementById('testing-btn'),
        deployment: document.getElementById('deployment-btn')
    };

    for (const [section, element] of Object.entries(sidebarItems)) {
        if (element) {
            element.addEventListener('click', () => {
                vscode.postMessage({ command: 'switchSection', section });
                updateActiveSection(section);
            });
        }
    }

    function updateActiveSection(section) {
        for (const btn of Object.values(sidebarItems)) {
            if (btn) {
                btn.classList.remove('active');
            }
        }
        if (sidebarItems[section]) {
            sidebarItems[section].classList.add('active');
        }
    }

    function initSection() {
        const generateContractsBtn = document.getElementById('generate-contracts-btn');
        const codePreview = document.getElementById("code-preview");
        const promptInput = document.getElementById("prompt-input");

        // if (loadedContracts.length > 0) {
        //     showContractPreview();
        // }

        if (generateContractsBtn) {
            generateContractsBtn.addEventListener("click", () => {
                if (loadedContracts.length === 0) {
                    return;
                }

                generateContractsBtn.disabled = true;
                generateContractsBtn.innerHTML = `
                    <div class="flex items-center justify-center">
                        <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Loading...
                    </div>
                `;

                setTimeout(() => {
                    vscode.postMessage({
                        command: "generateContracts",
                        contracts: loadedContracts,
                        prompt: promptInput ? promptInput.value.trim() : ''
                    });
                }, 4000);
            });
        }

        const deployButton = document.getElementById('deploy-button');
        if (deployButton) {
            deployButton.addEventListener('click', () => {
                const mnemonicInput = document.getElementById('mnemonic-input');
                const networkSelector = document.getElementById('network-selector');

                const mnemonic = mnemonicInput ? mnemonicInput.value.trim() : '';
                const network = networkSelector ? networkSelector.value : 'testnet';

                const logPre = document.getElementById('code-preview');
                if (logPre) {
                    logPre.textContent = '[INFO] Starting Clarinet deployments process...';
                }

                vscode.postMessage({
                    command: 'startDeployment',
                    mnemonic,
                    network
                });
            });
        }
    }

    function onSectionChanged() {
        initSection();
    }

    function showContractPreview() {
        if (loadedContracts.length > 0) {
            const contract = loadedContracts[0];
            document.getElementById("code-preview").innerText = `${contract.code}`;
        }
    }

    window.addEventListener('message', (event) => {
        const message = event.data;
        const { command } = message;
        const generateContractsBtn = document.getElementById('generate-contracts-btn');

        switch (command) {
            case 'deploymentLog':
                appendLog(message.log);
                break;
            case 'deploymentError':
                appendLog(`[ERROR] ${message.error}`);
                break;
            case 'deploymentComplete':
                appendLog('[INFO] Deployments completed!');
                break;
            case 'sectionChanged':
                updateActiveSection(message.section);
                setTimeout(onSectionChanged, 100);
                break;
            case 'contractsGenerated':
                handleContractsGenerated(message.results);

                if (generateContractsBtn) {
                    generateContractsBtn.disabled = false;
                    generateContractsBtn.innerHTML = "Generate Contracts";
                }
                break;
            case 'loadContracts':
                loadedContracts = Array.isArray(message.contracts) ? message.contracts : [message.contracts];

                vscode.setState({ loadedContracts });

                // showContractPreview();

                if (generateContractsBtn) {
                    generateContractsBtn.disabled = false;
                    generateContractsBtn.innerHTML = "Generate Contracts";
                }
                break;
        }
    });

    function appendLog(line) {
        const logPre = document.getElementById('code-preview');
        if (logPre) {
            logPre.textContent += '\n' + line;
            logPre.scrollTop = logPre.scrollHeight;
        }
    }

    function handleContractsGenerated(results) {
        const resultsContainer = document.getElementById('generation-results');
        const resultsList = document.getElementById('results-list');
        const codePreview = document.getElementById('code-preview');

        if (resultsContainer && resultsList) {
            resultsList.innerHTML = '';

            let logOutput = '// Contract generation results:\n';

            results.forEach(result => {
                const resultItem = document.createElement('div');
                resultItem.className = `p-2 mb-2 border-l-4 ${result.success ? 'border-green-500' : 'border-red-500'}`;

                resultItem.innerHTML = `
                    <strong>${result.name}</strong>: 
                    ${result.success 
                        ? `Created successfully` 
                        : `Failed: ${result.error}`}
                `;

                resultsList.appendChild(resultItem);

                logOutput += `// ${result.success ? '✓' : '✗'} ${result.name}: ${result.success ? 'Created successfully' : result.error}\n`;
            });

            resultsContainer.style.display = 'block';

            if (codePreview) {
                const successCount = results.filter(r => r.success).length;
                codePreview.textContent = logOutput + `\n// Generated ${successCount} out of ${results.length} contracts.`;
            }
        }
    }

    updateActiveSection('builder');
    setTimeout(initSection, 100);
})();



// import { BuilderService } from '../src/core/BuilderService.js';
// import { DeploymentService } from '../src/core/DeploymentService.js';

// (function () {
//     const vscode = acquireVsCodeApi();
//     let loadedContracts = vscode.getState()?.loadedContracts || [];

//     const builderService = new BuilderService(vscode, loadedContracts);
//     const deploymentService = new DeploymentService(vscode);

//     const sidebarItems = {
//         builder: document.getElementById('builder-btn'),
//         testing: document.getElementById('testing-btn'),
//         deployment: document.getElementById('deployment-btn')
//     };

//     for (const [section, element] of Object.entries(sidebarItems)) {
//         if (element) {
//             element.addEventListener('click', () => {
//                 vscode.postMessage({ command: 'switchSection', section });
//                 updateActiveSection(section);
//             });
//         }
//     }

//     function updateActiveSection(section) {
//         for (const btn of Object.values(sidebarItems)) {
//             btn?.classList.remove('active');
//         }
//         sidebarItems[section]?.classList.add('active');
//     }

//     function onSectionChanged(section) {
//         if (section === 'builder') builderService.init();
//         if (section === 'deployment') deploymentService.init();
//     }

//     window.addEventListener('message', (event) => {
//         const message = event.data;
//         const generateBtn = document.getElementById('generate-contracts-btn');

//         switch (message.command) {
//             case 'deploymentLog':
//                 deploymentService.appendLog(message.log);
//                 break;
//             case 'deploymentError':
//                 deploymentService.appendLog(`[ERROR] ${message.error}`);
//                 break;
//             case 'deploymentComplete':
//                 deploymentService.appendLog('[INFO] Deployments completed!');
//                 break;
//             case 'sectionChanged':
//                 updateActiveSection(message.section);
//                 setTimeout(() => onSectionChanged(message.section), 100);
//                 break;
//             case 'contractsGenerated':
//                 builderService.handleContractsGenerated(message.results);
//                 if (generateBtn) {
//                     // generateBtn.disabled = false;
//                     generateBtn.innerHTML = 'Generate Contracts';
//                 }
//                 break;
//             case 'loadContracts':
//                 loadedContracts = Array.isArray(message.contracts) ? message.contracts : [message.contracts];
//                 vscode.setState({ loadedContracts });
//                 if (generateBtn) {
//                     // generateBtn.disabled = false;
//                     generateBtn.innerHTML = 'Generate Contracts';
//                 }
//                 break;
//         }
//     });

//     updateActiveSection('builder');
//     setTimeout(() => onSectionChanged('builder'), 100);
// })();