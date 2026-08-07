/**
 * S Panel - Firewall Page
 */
const FirewallPage = {
    async render() {
        const container = document.getElementById('page-content');
        container.innerHTML = `
            <div class="page-header">
                <h2>Firewall (UFW)</h2>
                <div class="page-header-actions" id="fw-actions">
                    <!-- Actions injected here -->
                </div>
            </div>
            <div id="fw-content"><div class="loading-state"><div class="spinner"></div></div></div>
        `;
        lucide.createIcons({ nameAttr: 'data-lucide', node: container });
        await this.loadStatus();
    },

    async loadStatus() {
        const el = document.getElementById('fw-content');
        const actionsEl = document.getElementById('fw-actions');
        
        try {
            const status = await API.get('/api/firewall/status');
            
            if (!status.installed) {
                actionsEl.innerHTML = '';
                el.innerHTML = `<div class="empty-state"><i data-lucide="shield" class="empty-state-icon"></i><h3>UFW Not Installed</h3><p>Install UFW from the Software Store to manage firewall rules.</p><button class="btn btn-primary" style="margin-top:var(--space-4);" onclick="App.navigate('software')">Go to Software Store</button></div>`;
                lucide.createIcons({ nameAttr: 'data-lucide', node: el });
                return;
            }

            if (!status.active) {
                actionsEl.innerHTML = `<button class="btn btn-success" onclick="FirewallPage.enable()"><i data-lucide="shield-check"></i> Enable Firewall</button>`;
                el.innerHTML = `<div class="empty-state"><i data-lucide="shield-off" class="empty-state-icon"></i><h3>Firewall is Disabled</h3><p>Enable the firewall to protect your server. Port 22 (SSH) and 8888 (Panel) will be allowed automatically.</p></div>`;
                lucide.createIcons({ nameAttr: 'data-lucide', node: el });
                lucide.createIcons({ nameAttr: 'data-lucide', node: actionsEl });
                return;
            }

            actionsEl.innerHTML = `
                <button class="btn btn-danger" onclick="FirewallPage.disable()"><i data-lucide="shield-off"></i> Disable</button>
                <button class="btn btn-primary" onclick="FirewallPage.showAddModal()"><i data-lucide="plus"></i> Add Rule</button>
            `;
            lucide.createIcons({ nameAttr: 'data-lucide', node: actionsEl });

            const rules = await API.get('/api/firewall/rules');
            
            if (rules.length === 0) {
                el.innerHTML = `<div class="empty-state"><h3>No Rules</h3></div>`;
                return;
            }

            let html = '<div class="table-container"><table class="data-table"><thead><tr><th>ID</th><th>To Action</th><th>From</th><th>Actions</th></tr></thead><tbody>';
            for (const rule of rules) {
                const actionColor = rule.action.includes('ALLOW') ? 'success' : 'danger';
                html += `
                    <tr>
                        <td style="color:var(--text-tertiary);">${rule.number}</td>
                        <td style="font-family:var(--font-mono);">${rule.port} <span class="badge badge-${actionColor}" style="margin-left:8px;">${rule.action}</span></td>
                        <td>${rule.from}</td>
                        <td><button class="btn btn-sm btn-danger" onclick="FirewallPage.deleteRule(${rule.number})"><i data-lucide="trash-2"></i></button></td>
                    </tr>
                `;
            }
            html += '</tbody></table></div>';
            el.innerHTML = html;
            lucide.createIcons({ nameAttr: 'data-lucide', node: el });
        } catch (err) { el.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${err.message}</p></div>`; }
    },

    showAddModal() {
        Modal.open('Add Firewall Rule', `
            <div class="form-group" style="margin-bottom:var(--space-4);">
                <label>Port / Service (e.g., 80, 443, 8080/tcp)</label>
                <input type="text" id="fw-port" placeholder="80">
            </div>
            <div class="form-group" style="margin-bottom:var(--space-4);">
                <label>Action</label>
                <select id="fw-action">
                    <option value="allow">ALLOW</option>
                    <option value="deny">DENY</option>
                </select>
            </div>
            <div class="form-group" style="margin-bottom:var(--space-4);">
                <label>Source IP (optional, leave blank for Anywhere)</label>
                <input type="text" id="fw-ip" placeholder="192.168.1.0/24">
            </div>
            <div class="form-group">
                <label>Comment (optional)</label>
                <input type="text" id="fw-comment" placeholder="Web server">
            </div>
        `, `
            <button class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
            <button class="btn btn-primary" onclick="FirewallPage.addRule()">Add Rule</button>
        `);
    },

    async addRule() {
        const port = document.getElementById('fw-port').value;
        if (!port) { Toast.warning('Required', 'Port is required'); return; }
        
        try {
            await API.post('/api/firewall/rules', {
                port,
                action: document.getElementById('fw-action').value,
                from_ip: document.getElementById('fw-ip').value,
                comment: document.getElementById('fw-comment').value
            });
            Modal.close();
            Toast.success('Added', 'Firewall rule added');
            this.loadStatus();
        } catch (err) { Toast.error('Error', err.message); }
    },

    deleteRule(num) {
        Modal.confirm('Delete Rule', `Delete rule number ${num}?`, async () => {
            try { await API.delete(`/api/firewall/rules/${num}`); Toast.success('Deleted', 'Rule removed'); this.loadStatus(); } catch (err) { Toast.error('Error', err.message); }
        }, 'Delete', true);
    },

    async enable() {
        try { await API.post('/api/firewall/enable'); Toast.success('Enabled', 'Firewall enabled'); this.loadStatus(); } catch (err) { Toast.error('Error', err.message); }
    },

    async disable() {
        try { await API.post('/api/firewall/disable'); Toast.success('Disabled', 'Firewall disabled'); this.loadStatus(); } catch (err) { Toast.error('Error', err.message); }
    },

    destroy() {}
};
