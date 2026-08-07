/**
 * S Panel - Software Store Page
 */
const SoftwarePage = {
    ws: null,

    async render() {
        const container = document.getElementById('page-content');
        container.innerHTML = `
            <div class="page-header">
                <h2>Software Store</h2>
                <div class="page-header-actions">
                    <button class="btn btn-secondary" onclick="SoftwarePage.loadCatalog()"><i data-lucide="refresh-cw"></i> Refresh</button>
                </div>
            </div>
            <div id="software-content"><div class="loading-state"><div class="spinner"></div></div></div>
        `;
        lucide.createIcons({ nameAttr: 'data-lucide', node: container });
        await this.loadCatalog();
    },

    async loadCatalog() {
        const el = document.getElementById('software-content');
        try {
            const catalog = await API.get('/api/software/catalog');
            
            let html = '<div class="software-grid">';
            for (const item of catalog) {
                html += `
                    <div class="software-card">
                        <div class="software-card-header">
                            <div class="software-icon">${item.icon}</div>
                            <div class="software-info">
                                <h3>${item.name}</h3>
                                <span class="software-category">${item.category}</span>
                            </div>
                        </div>
                        <p class="software-description">${item.description}</p>
                        <div class="software-footer">
                            <span class="software-version">${item.installed ? 'v' + item.version : ''}</span>
                            <div>
                                ${item.installed 
                                    ? `<button class="btn btn-sm btn-danger" onclick="SoftwarePage.uninstall('${item.id}', '${item.name}')">Uninstall</button>`
                                    : `<button class="btn btn-sm btn-primary" onclick="SoftwarePage.install('${item.id}', '${item.name}')">Install</button>`
                                }
                            </div>
                        </div>
                    </div>
                `;
            }
            html += '</div>';
            el.innerHTML = html;
        } catch (err) { el.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${err.message}</p></div>`; }
    },

    install(id, name) {
        Modal.open(`Installing ${name}`, `
            <div id="install-log" class="code-block" style="height:300px;overflow-y:auto;background:#000;color:#0f0;font-size:12px;">
                Starting installation...<br>
            </div>
        `, `<button class="btn btn-secondary" onclick="Modal.close()" id="install-close-btn" disabled>Close</button>`, { wide: true });

        const logEl = document.getElementById('install-log');
        const closeBtn = document.getElementById('install-close-btn');
        
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = API.baseUrl ? API.baseUrl.replace('http://', '').replace('https://', '') : window.location.host;
        
        this.ws = new WebSocket(`${protocol}//${host}/api/software/install/ws?software_id=${id}&token=${API.token}`);

        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.status === 'progress') {
                logEl.innerHTML += `${data.message}<br>`;
                logEl.scrollTop = logEl.scrollHeight;
            } else if (data.status === 'complete') {
                logEl.innerHTML += `<br><span style="color:#fff">Installation completed successfully.</span>`;
                closeBtn.disabled = false;
                closeBtn.classList.remove('btn-secondary');
                closeBtn.classList.add('btn-primary');
                this.loadCatalog();
            } else if (data.status === 'error') {
                logEl.innerHTML += `<br><span style="color:#f00">Error: ${data.message}</span>`;
                closeBtn.disabled = false;
            }
        };

        this.ws.onclose = () => {
            closeBtn.disabled = false;
        };
    },

    uninstall(id, name) {
        Modal.confirm('Uninstall Software', `Are you sure you want to uninstall <strong>${name}</strong>? This may break dependencies.`, async () => {
            try { 
                await API.post('/api/software/uninstall', { software_id: id }); 
                Toast.success('Uninstalled', `${name} uninstalled`); 
                this.loadCatalog(); 
            } catch (err) { Toast.error('Error', err.message); }
        }, 'Uninstall', true);
    },

    destroy() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
};
