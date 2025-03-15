(function() {
    const vscode = acquireVsCodeApi();

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
        const previewContractBtn = document.getElementById('preview-contract-btn');
        const codePreview = document.getElementById("code-preview");

        if (generateContractsBtn) {
            generateContractsBtn.addEventListener("click", () => {
                
                if (loadedContracts.length > 0) {
                    vscode.postMessage({
                        command: "generateContracts",
                        contracts: loadedContracts
                    });
                    
                    appendLog(`// Enviando solicitud para generar ${loadedContracts.length} contratos desde data.json...`);
                } else {
                    appendLog("// Error: No hay contratos cargados desde data.json");
                }
            });
        }
        
        if (previewContractBtn) {
            previewContractBtn.addEventListener('click', () => {
                previewContractFromJson();
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
    
    function previewContractFromJson() {
        const jsonTextarea = document.getElementById('contract-json');
        const codePreview = document.getElementById('code-preview');
        
        if (!jsonTextarea || !codePreview) return;
        
        try {
            let contracts = JSON.parse(jsonTextarea.value);
            
            if (!Array.isArray(contracts)) {
                contracts = [contracts];
            }
            
            if (contracts.length === 0) {
                codePreview.textContent = "// No contracts found in JSON";
                return;
            }
            
            const contract = contracts[0];
            
            if (!contract.name || !contract.code) {
                codePreview.textContent = "// Invalid contract format. Both name and code are required.";
                return;
            }
            

            let contractCode = contract.code;
            try {
                if (/^[A-Za-z0-9+/=]+$/.test(contract.code)) {
                    contractCode = atob(contract.code);
                }
            } catch (e) {
                
            }
            
            codePreview.textContent = `// Contract: ${contract.name}\n\n${contractCode}`;
            
        } catch (e) {
            codePreview.textContent = `// Error parsing JSON: ${e.message}`;
        }
    }

    function onSectionChanged() {
        initSection();
    }

    let loadedContracts = [];

    window.addEventListener('message', (event) => {
        const message = event.data;
        const { command } = message;

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
                break;
                case 'loadContracts':
                    console.log("📄 Contratos recibidos desde data.json:", message.contracts);
                    loadedContracts = Array.isArray(message.contracts) ? message.contracts : [message.contracts];
                    
                    if (loadedContracts.length > 0) {
                        const contract = loadedContracts[0];
                        document.getElementById("code-preview").innerText = `// Contract: ${contract.name}\n\n${contract.code}`;
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