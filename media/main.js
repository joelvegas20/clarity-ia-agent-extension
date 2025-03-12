// main.js
(function() {
    // Obtener una referencia al API de webview de VSCode
    const vscode = acquireVsCodeApi();
    
    // Elementos de la barra lateral
    const sidebarItems = {
        builder: document.getElementById('builder-btn'),
        testing: document.getElementById('testing-btn'),
        deployment: document.getElementById('deployment-btn')
    };
    
    // Configurar event listeners para los botones de la barra lateral
    for (const [section, element] of Object.entries(sidebarItems)) {
        if (element) {
            element.addEventListener('click', () => {
                // Enviar mensaje a la extensión para cambiar de sección
                vscode.postMessage({
                    command: 'switchSection',
                    section: section
                });
                
                // Actualizar UI (opcional, la extensión también actualiza la UI)
                updateActiveSection(section);
            });
        }
    }
    
    // Función para actualizar la sección activa en la UI
    function updateActiveSection(section) {
        // Eliminar la clase 'active' de todos los elementos
        for (const element of Object.values(sidebarItems)) {
            if (element) {
                element.classList.remove('active', 'bg-red-700');
            }
        }
        
        // Añadir las clases 'active' y 'bg-gray-700' al elemento seleccionado
        if (sidebarItems[section]) {
            sidebarItems[section].classList.add('active', 'bg-red-700');
        }
    }
    
    // Escuchar mensajes de la extensión
    window.addEventListener('message', event => {
        const message = event.data;
        
        switch (message.command) {
            case 'sectionChanged':
                updateActiveSection(message.section);
                break;
        }
    });
    
    // Configuración inicial: marcar el botón builder como activo
    updateActiveSection('builder');
})();