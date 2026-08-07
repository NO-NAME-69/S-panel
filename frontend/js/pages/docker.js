/**
 * S Panel - Docker Page
 */
const DockerPage = {
    activeTab: 'containers',

    async render() {
        const container = document.getElementById('page-content');
        container.innerHTML = `
            <div class="page-header">
                <h2>Docker Manager</h2>
                <div class="page-header-actions" id="docker-actions"></div>
            </div>
            <div id="docker-status"></div>
            <div class="tabs" id="docker-tabs" style="display:none;">
                <button class="tab active" onclick="DockerPage.switchTab('containers', this)">Containers</button>
                <button class="tab" onclick="DockerPage.switchTab('images', this)">Images</button>
                <button class="tab" onclick="DockerPage.switchTab('volumes', this)">Volumes</button>
                <button class="tab" onclick="DockerPage.switchTab('networks', this)">Networks</button>
            </div>
            <div id="docker-content" class="docker-tabs-content"><div class="loading-state"><div class="spinner"></div></div></div>
        `;
        lucide.createIcons({ nameAttr: 'data-lucide', node: container });
        await this.checkStatus();
    },

    async checkStatus() {
        const statusEl = document.getElementById('docker-status');
        const contentEl = document.getElementById('docker-content');
        const tabsEl = document.getElementById('docker-tabs');
        
        try {
            const status = await API.get('/api/docker/status');
            
            if (!status.installed) {
                contentEl.innerHTML = `<div class="empty-state"><i data-lucide="container" class="empty-state-icon"></i><h3>Docker Not Installed</h3><p>Install Docker from the Software Store to manage containers.</p><button class="btn btn-primary" style="margin-top:var(--space-4);" onclick="App.navigate('software')">Go to Software Store</button></div>`;
                lucide.createIcons({ nameAttr: 'data-lucide', node: contentEl });
                return;
            }
            
            if (!status.running) {
                contentEl.innerHTML = `<div class="empty-state"><i data-lucide="alert-triangle" class="empty-state-icon" style="color:var(--warning);"></i><h3>Docker Engine Stopped</h3><p>The Docker service is currently stopped. Start it from the Services page.</p><button class="btn btn-primary" style="margin-top:var(--space-4);" onclick="App.navigate('services')">Go to Services</button></div>`;
                lucide.createIcons({ nameAttr: 'data-lucide', node: contentEl });
                return;
            }

            tabsEl.style.display = 'flex';
            this.loadTabContent();

        } catch (err) { contentEl.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${err.message}</p></div>`; }
    },

    switchTab(tab, el) {
        this.activeTab = tab;
        document.querySelectorAll('#docker-tabs .tab').forEach(t => t.classList.remove('active'));
        el.classList.add('active');
        this.loadTabContent();
    },

    async loadTabContent() {
        const el = document.getElementById('docker-content');
        const actionsEl = document.getElementById('docker-actions');
        
        try {
            if (this.activeTab === 'containers') {
                actionsEl.innerHTML = `<button class="btn btn-secondary" onclick="DockerPage.loadTabContent()"><i data-lucide="refresh-cw"></i></button>`;
                lucide.createIcons({ nameAttr: 'data-lucide', node: actionsEl });
                
                const containers = await API.get('/api/docker/containers');
                if (containers.length === 0) {
                    el.innerHTML = `<div class="empty-state"><h3>No Containers</h3></div>`;
                    return;
                }
                
                let html = '';
                for (const c of containers) {
                    const isRunning = c.State === 'running';
                    html += `
                        <div class="container-card">
                            <div class="container-status ${isRunning ? 'running' : 'stopped'}"></div>
                            <div class="container-info">
                                <div class="container-name">${c.Names}</div>
                                <div class="container-image">${c.Image} &middot; ${c.Status}</div>
                            </div>
                            <div class="container-actions">
                                ${isRunning 
                                    ? `<button class="btn btn-sm btn-secondary" onclick="DockerPage.action('containers', '${c.ID}', 'stop')"><i data-lucide="square"></i></button>
                                       <button class="btn btn-sm btn-secondary" onclick="DockerPage.action('containers', '${c.ID}', 'restart')"><i data-lucide="refresh-cw"></i></button>`
                                    : `<button class="btn btn-sm btn-success" onclick="DockerPage.action('containers', '${c.ID}', 'start')"><i data-lucide="play"></i></button>`
                                }
                                <button class="btn btn-sm btn-secondary" onclick="DockerPage.viewLogs('${c.ID}', '${c.Names}')"><i data-lucide="file-text"></i></button>
                                <button class="btn btn-sm btn-danger" onclick="DockerPage.removeContainer('${c.ID}', '${c.Names}')"><i data-lucide="trash-2"></i></button>
                            </div>
                        </div>
                    `;
                }
                el.innerHTML = html;
                lucide.createIcons({ nameAttr: 'data-lucide', node: el });
                
            } else if (this.activeTab === 'images') {
                actionsEl.innerHTML = `<button class="btn btn-primary" onclick="DockerPage.showPullModal()"><i data-lucide="download"></i> Pull Image</button>`;
                lucide.createIcons({ nameAttr: 'data-lucide', node: actionsEl });
                
                const images = await API.get('/api/docker/images');
                let html = '<div class="table-container"><table class="data-table"><thead><tr><th>Repository:Tag</th><th>ID</th><th>Size</th><th>Created</th><th>Actions</th></tr></thead><tbody>';
                for (const img of images) {
                    html += `
                        <tr>
                            <td style="font-weight:500;">${img.Repository}:${img.Tag}</td>
                            <td style="font-family:var(--font-mono);font-size:12px;">${img.ID}</td>
                            <td>${img.Size}</td>
                            <td>${img.CreatedAt.split(' ')[0]}</td>
                            <td><button class="btn btn-sm btn-danger" onclick="DockerPage.removeImage('${img.ID}')"><i data-lucide="trash-2"></i></button></td>
                        </tr>
                    `;
                }
                html += '</tbody></table></div>';
                el.innerHTML = html;
                lucide.createIcons({ nameAttr: 'data-lucide', node: el });
                
            } else if (this.activeTab === 'volumes') {
                actionsEl.innerHTML = `<button class="btn btn-secondary" onclick="DockerPage.loadTabContent()"><i data-lucide="refresh-cw"></i></button>`;
                lucide.createIcons({ nameAttr: 'data-lucide', node: actionsEl });
                
                const volumes = await API.get('/api/docker/volumes');
                let html = '<div class="table-container"><table class="data-table"><thead><tr><th>Name</th><th>Driver</th></tr></thead><tbody>';
                for (const vol of volumes) {
                    html += `<tr><td>${vol.Name}</td><td>${vol.Driver}</td></tr>`;
                }
                html += '</tbody></table></div>';
                el.innerHTML = html;
                
            } else if (this.activeTab === 'networks') {
                actionsEl.innerHTML = `<button class="btn btn-secondary" onclick="DockerPage.loadTabContent()"><i data-lucide="refresh-cw"></i></button>`;
                lucide.createIcons({ nameAttr: 'data-lucide', node: actionsEl });
                
                const networks = await API.get('/api/docker/networks');
                let html = '<div class="table-container"><table class="data-table"><thead><tr><th>Name</th><th>Driver</th><th>Scope</th></tr></thead><tbody>';
                for (const net of networks) {
                    html += `<tr><td>${net.Name}</td><td>${net.Driver}</td><td>${net.Scope}</td></tr>`;
                }
                html += '</tbody></table></div>';
                el.innerHTML = html;
            }
        } catch (err) { el.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${err.message}</p></div>`; }
    },

    async action(type, id, act) {
        try {
            await API.post(`/api/docker/${type}/${id}/${act}`);
            Toast.success('Success', `Action ${act} completed`);
            this.loadTabContent();
        } catch (err) { Toast.error('Error', err.message); }
    },

    removeContainer(id, name) {
        Modal.confirm('Remove Container', `Remove container ${name}?`, async () => {
            try { await API.delete(`/api/docker/containers/${id}?force=true`); Toast.success('Removed', 'Container removed'); this.loadTabContent(); } catch (err) { Toast.error('Error', err.message); }
        }, 'Remove', true);
    },

    removeImage(id) {
        Modal.confirm('Remove Image', `Remove image ${id}?`, async () => {
            try { await API.delete(`/api/docker/images/${id}?force=true`); Toast.success('Removed', 'Image removed'); this.loadTabContent(); } catch (err) { Toast.error('Error', err.message); }
        }, 'Remove', true);
    },

    async viewLogs(id, name) {
        try {
            const result = await API.get(`/api/docker/containers/${id}/logs`);
            Modal.open(`Logs: ${name}`, `<pre class="code-block" style="max-height:500px;overflow-y:auto;">${result.logs || 'No logs'}</pre>`, '', { wide: true });
        } catch (err) { Toast.error('Error', err.message); }
    },

    showPullModal() {
        Modal.open('Pull Image', `
            <div class="form-group">
                <label>Image Name</label>
                <input type="text" id="pull-image-name" placeholder="nginx:latest">
            </div>
        `, `
            <button class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
            <button class="btn btn-primary" onclick="DockerPage.pullImage()" id="pull-btn">Pull</button>
        `);
    },

    async pullImage() {
        const image = document.getElementById('pull-image-name').value;
        if (!image) return;
        
        const btn = document.getElementById('pull-btn');
        btn.disabled = true;
        btn.innerHTML = '<span class="btn-loader"></span> Pulling...';
        
        try {
            await API.post('/api/docker/images/pull', { image });
            Modal.close();
            Toast.success('Success', `Image ${image} pulled`);
            this.loadTabContent();
        } catch (err) { 
            Toast.error('Error', err.message);
            btn.disabled = false;
            btn.textContent = 'Pull';
        }
    },

    destroy() {}
};
