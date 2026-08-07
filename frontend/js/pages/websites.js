/**
 * S Panel - Websites Page
 */
const WebsitesPage = {
    async render() {
        const container = document.getElementById('page-content');
        container.innerHTML = `
            <div class="page-header">
                <h2>Websites</h2>
                <div class="page-header-actions">
                    <button class="btn btn-primary" onclick="WebsitesPage.showCreateModal()">
                        <i data-lucide="plus"></i> Add Website
                    </button>
                </div>
            </div>
            <div id="websites-list"><div class="loading-state"><div class="spinner"></div><p>Loading websites...</p></div></div>
        `;
        lucide.createIcons({ nameAttr: 'data-lucide', node: container });
        await this.loadWebsites();
    },

    async loadWebsites() {
        try {
            const sites = await API.get('/api/websites/');
            const el = document.getElementById('websites-list');
            if (sites.length === 0) {
                el.innerHTML = `<div class="empty-state"><i data-lucide="globe" class="empty-state-icon"></i><h3>No Websites</h3><p>Add your first website to get started. Make sure Nginx is installed.</p></div>`;
                lucide.createIcons({ nameAttr: 'data-lucide', node: el });
                return;
            }
            let html = '';
            for (const site of sites) {
                const statusBadge = site.status === 'active' ? '<span class="badge badge-success badge-dot">Active</span>' : '<span class="badge badge-danger badge-dot">Disabled</span>';
                html += `
                    <div class="card" style="margin-bottom:var(--space-3);display:flex;align-items:center;gap:var(--space-4);flex-wrap:wrap;">
                        <div style="flex:1;min-width:200px;">
                            <div style="font-weight:600;font-size:var(--text-base);">${site.domain}</div>
                            <div style="font-size:var(--text-xs);color:var(--text-tertiary);font-family:var(--font-mono);">${site.root_path}</div>
                        </div>
                        <div>${statusBadge}</div>
                        ${site.ssl_enabled ? '<span class="badge badge-success"><i data-lucide="lock" style="width:12px;height:12px;"></i> SSL</span>' : ''}
                        <div style="display:flex;gap:var(--space-2);">
                            <button class="btn btn-sm btn-secondary" onclick="WebsitesPage.toggleSite('${site.domain}')">
                                <i data-lucide="${site.status === 'active' ? 'pause' : 'play'}"></i>
                            </button>
                            <button class="btn btn-sm btn-ghost" onclick="WebsitesPage.viewConfig('${site.domain}')">
                                <i data-lucide="file-code"></i>
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="WebsitesPage.deleteSite('${site.domain}')">
                                <i data-lucide="trash-2"></i>
                            </button>
                        </div>
                    </div>
                `;
            }
            el.innerHTML = html;
            lucide.createIcons({ nameAttr: 'data-lucide', node: el });
        } catch (err) {
            Toast.error('Error', err.message);
        }
    },

    showCreateModal() {
        Modal.open('Add Website', `
            <div class="form-group" style="margin-bottom:var(--space-4);">
                <label>Domain Name</label>
                <input type="text" id="new-site-domain" placeholder="example.com">
            </div>
            <div class="form-group" style="margin-bottom:var(--space-4);">
                <label>Root Path (optional)</label>
                <input type="text" id="new-site-root" placeholder="/var/www/example.com">
            </div>
            <div class="form-group">
                <label>PHP Version (optional)</label>
                <input type="text" id="new-site-php" placeholder="8.3">
            </div>
        `, `
            <button class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
            <button class="btn btn-primary" onclick="WebsitesPage.createSite()">Create</button>
        `);
    },

    async createSite() {
        const domain = document.getElementById('new-site-domain').value;
        if (!domain) { Toast.warning('Required', 'Domain name is required'); return; }
        try {
            await API.post('/api/websites/', {
                domain,
                root_path: document.getElementById('new-site-root').value,
                php_version: document.getElementById('new-site-php').value
            });
            Modal.close();
            Toast.success('Created', `Website ${domain} created`);
            await this.loadWebsites();
        } catch (err) { Toast.error('Error', err.message); }
    },

    async toggleSite(domain) {
        try {
            const result = await API.post(`/api/websites/${domain}/toggle`);
            Toast.success('Updated', result.message);
            await this.loadWebsites();
        } catch (err) { Toast.error('Error', err.message); }
    },

    async viewConfig(domain) {
        try {
            const result = await API.get(`/api/websites/${domain}/config`);
            Modal.open(`Config: ${domain}`, `<pre class="code-block">${result.config}</pre>`, '', { wide: true });
        } catch (err) { Toast.error('Error', err.message); }
    },

    deleteSite(domain) {
        Modal.confirm('Delete Website', `Are you sure you want to delete <strong>${domain}</strong>? This will remove the Nginx configuration.`, async () => {
            try {
                await API.delete(`/api/websites/${domain}`);
                Toast.success('Deleted', `Website ${domain} deleted`);
                await this.loadWebsites();
            } catch (err) { Toast.error('Error', err.message); }
        }, 'Delete', true);
    },

    destroy() {}
};
