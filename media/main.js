(function() {
    const vscode = acquireVsCodeApi();

    // Sidebar (si tienes botones builder, testing, deployment, etc.)
    const sidebarItems = {
        builder: document.getElementById('builder-btn'),
        testing: document.getElementById('testing-btn'),
        deployment: document.getElementById('deployment-btn')
    };

    // Asignar evento a cada botón de la barra lateral
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

    // >>> Escuchamos el click en el botón "deploy" (o "generate & deploy") <<<
    const deployButton = document.getElementById('deploy-button');
    if (deployButton) {
        deployButton.addEventListener('click', () => {
            const mnemonicInput = document.getElementById('mnemonic-input');
            const networkSelector = document.getElementById('network-selector');

            const mnemonic = mnemonicInput ? mnemonicInput.value.trim() : '';
            const network = networkSelector ? networkSelector.value : 'testnet';

            // Limpiamos la consola
            const logPre = document.getElementById('code-preview');
            if (logPre) {
                logPre.textContent = '[INFO] Starting Clarinet deployments process...';
            }

            // Enviamos mensaje a la extensión
            vscode.postMessage({
                command: 'startDeployment',
                mnemonic,
                network
            });
        });
    }

    // Escuchar mensajes de vuelta de la extensión
    window.addEventListener('message', (event) => {
        const { command, log, error } = event.data;

        switch (command) {
            case 'deploymentLog':
                appendLog(log);
                break;
            case 'deploymentError':
                appendLog(`[ERROR] ${error}`);
                break;
            case 'deploymentComplete':
                appendLog('[INFO] Deployments completed!');
                break;
            case 'sectionChanged':
                updateActiveSection(event.data.section);
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

    // Por defecto marcamos "builder" como sección activa
    updateActiveSection('builder');
})();