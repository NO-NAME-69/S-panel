/**
 * S Panel - Services Page
 */
const ServicesPage = {
    async render() {
        const container = document.getElementById('page-content');
        container.innerHTML = `
            <div class="page-header">
                <h2>System Services</h2>
                <div class="page-header-actions">
                    <button class="btn btn-secondary" onclick="ServicesPage.loadServices()"><i data-lucide="refresh-cw"></i> Refresh</button>
                </div>
            </div>
            <div id="services-content"><div class="loading-state"><div class="spinner"></div></div></div>
        `;
        lucide.createIcons({ nameAttr: 'data-lucide', node: container });
        await this.loadServices();
    },

    async loadServices() {
        const el = document.getElementById('services-content');
        try {
            const services = await API.get('/api/services/');
            
            let html = '<div class="table-container"><table class="data-table"><thead><tr><th>Service Name</th><th>Status</th><th>Startup</th><th>Actions</th></tr></thead><tbody>';
            
            for (const svc of services) {
                const statusBadge = svc.running 
                    ? '<span class="badge badge-success badge-dot">Running</span>' 
                    : '<span class="badge badge-danger badge-dot">Stopped</span>';
                    
                const bootBadge = svc.enabled 
                    ? '<span class="badge badge-info">Enabled</span>' 
                    : '<span class="badge badge-secondary">Disabled</span>';
                
                html += `
                    <tr>
                        <td style="font-weight:600;font-family:var(--font-mono);">${svc.name}</td>
                        <td>${statusBadge}</td>
                        <td>${bootBadge}</td>
                        <td>
                            <div style="display:flex;gap:var(--space-2);">
                                ${svc.running 
                                    ? `<button class="btn btn-sm btn-warning" onclick="ServicesPage.action('${svc.name}', 'restart')" title="Restart"><i data-lucide="refresh-cw"></i></button>
                                       <button class="btn btn-sm btn-danger" onclick="ServicesPage.action('${svc.name}', 'stop')" title="Stop"><i data-lucide="square"></i></button>`
                                    : `<button class="btn btn-sm btn-success" onclick="ServicesPage.action('${svc.name}', 'start')" title="Start"><i data-lucide="play"></i></button>`
                                }
                                <button class="btn btn-sm btn-secondary" onclick="ServicesPage.action('${svc.name}', '${svc.enabled ? 'disable' : 'enable'}')" title="Toggle Boot">
                                    <i data-lucide="${svc.enabled ? 'toggle-right' : 'toggle-left'}"></i>
                                </button>
                                <button class="btn btn-sm btn-secondary" onclick="ServicesPage.viewLogs('${svc.name}')" title="View Logs"><i data-lucide="file-text"></i></button>
                            </div>
                        </td>
                    </tr>
                `;
            }
            html += '</tbody></table></div>';
            el.innerHTML = html;
            lucide.createIcons({ nameAttr: 'data-lucide', node: el });
        } catch (err) { el.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${err.message}</p></div>`; }
    },

    async action(name, act) {
        try {
            await API.post(`/api/services/${name}/${act}`);
            Toast.success('Success', `Service ${name} ${act}ed`);
            this.loadServices();
        } catch (err) { Toast.error('Error', err.message); }
    },

    async viewLogs(name) {
        try {
            const result = await API.get(`/api/services/${name}/logs`);
            Modal.open(`Logs: ${name}`, `<pre class="code-block" style="max-height:500px;overflow-y:auto;">${result.logs || 'No logs available'}</pre>`, '', { wide: true });
        } catch (err) { Toast.error('Error', err.message); }
    },

    destroy() {}
};
