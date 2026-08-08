/**
 * S Panel - Databases Page
 */
const DatabasesPage = {
    activeTab: 'mysql',

    async render() {
        const container = document.getElementById('page-content');
        container.innerHTML = `
            <div class="page-header">
                <h2>Databases</h2>
                <div class="page-header-actions">
                    <button class="btn btn-primary" onclick="DatabasesPage.showCreateModal()"><i data-lucide="plus"></i> New Database</button>
                </div>
            </div>
            <div class="tabs">
                <button class="tab active" onclick="DatabasesPage.switchTab('mysql', this)">MySQL</button>
                <button class="tab" onclick="DatabasesPage.switchTab('mongodb', this)">MongoDB</button>
            </div>
            <div id="db-content"><div class="loading-state"><div class="spinner"></div></div></div>
        `;
        lucide.createIcons({ nameAttr: 'data-lucide', node: container });
        await this.loadDatabases();
    },

    switchTab(tab, el) {
        this.activeTab = tab;
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        el.classList.add('active');
        this.loadDatabases();
    },

    async loadDatabases() {
        const el = document.getElementById('db-content');
        try {
            if (this.activeTab === 'mysql') {
                const status = await API.get('/api/databases/mysql/status');
                if (!status.installed) {
                    el.innerHTML = `<div class="empty-state"><i data-lucide="database" class="empty-state-icon"></i><h3>MySQL Not Installed</h3><p>Install MySQL from the Software Store to manage databases.</p><button class="btn btn-primary" style="margin-top:var(--space-4);" onclick="App.navigate('software')">Go to Software Store</button></div>`;
                    lucide.createIcons({ nameAttr: 'data-lucide', node: el });
                    return;
                }
                const dbs = await API.get('/api/databases/mysql/databases');
                if (dbs.length === 0) {
                    el.innerHTML = `<div class="empty-state"><h3>No Databases</h3></div>`;
                    return;
                }
                let html = '<div class="table-container"><table class="data-table"><thead><tr><th>Database</th><th>Tables</th><th>Size</th><th>Type</th><th>Actions</th></tr></thead><tbody>';
                for (const db of dbs) {
                    html += `<tr>
                        <td style="font-weight:500;font-family:var(--font-mono);">${db.name}</td>
                        <td>${db.tables}</td>
                        <td>${DashboardPage.formatBytes(db.size)}</td>
                        <td>${db.system ? '<span class="badge badge-warning">System</span>' : '<span class="badge badge-info">User</span>'}</td>
                        <td>
                            ${!db.system ? `
                                <button class="btn btn-sm btn-secondary" title="Export" onclick="window.open('/api/databases/mysql/${db.name}/export?token=' + API.token)"><i data-lucide="download"></i></button>
                                <button class="btn btn-sm btn-secondary" title="Import" onclick="DatabasesPage.importDb('${db.name}')"><i data-lucide="upload"></i></button>
                                <button class="btn btn-sm btn-danger" title="Delete" onclick="DatabasesPage.deleteDb('${db.name}')"><i data-lucide="trash-2"></i></button>
                            ` : ''}
                        </td>
                    </tr>`;
                }
                html += '</tbody></table></div>';
                el.innerHTML = html;
            } else {
                const status = await API.get('/api/databases/mongodb/status');
                if (!status.installed) {
                    el.innerHTML = `<div class="empty-state"><i data-lucide="database" class="empty-state-icon"></i><h3>MongoDB Not Installed</h3><p>Install MongoDB from the Software Store.</p><button class="btn btn-primary" style="margin-top:var(--space-4);" onclick="App.navigate('software')">Go to Software Store</button></div>`;
                    lucide.createIcons({ nameAttr: 'data-lucide', node: el });
                    return;
                }
                const dbs = await API.get('/api/databases/mongodb/databases');
                let html = '<div class="table-container"><table class="data-table"><thead><tr><th>Database</th><th>Size</th><th>Actions</th></tr></thead><tbody>';
                for (const db of dbs) {
                    html += `<tr>
                        <td style="font-family:var(--font-mono);">${db.name}</td>
                        <td>${DashboardPage.formatBytes(db.sizeOnDisk || 0)}</td>
                        <td>
                            <button class="btn btn-sm btn-secondary" title="Export" onclick="window.open('/api/databases/mongodb/${db.name}/export?token=' + API.token)"><i data-lucide="download"></i></button>
                            <button class="btn btn-sm btn-secondary" title="Import" onclick="DatabasesPage.importMongoDb('${db.name}')"><i data-lucide="upload"></i></button>
                            <button class="btn btn-sm btn-danger" title="Delete" onclick="DatabasesPage.deleteMongoDb('${db.name}')"><i data-lucide="trash-2"></i></button>
                        </td>
                    </tr>`;
                }
                html += '</tbody></table></div>';
                el.innerHTML = html;
            }
            lucide.createIcons({ nameAttr: 'data-lucide', node: el });
        } catch (err) { el.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${err.message}</p></div>`; }
    },

    showCreateModal() {
        Modal.open('Create Database', `
            <div class="form-group" style="margin-bottom:var(--space-4);"><label>Database Name</label><input type="text" id="new-db-name" placeholder="my_database"></div>
            <div class="form-group"><label>Type</label><select id="new-db-type"><option value="mysql">MySQL</option><option value="mongodb">MongoDB</option></select></div>
        `, `<button class="btn btn-secondary" onclick="Modal.close()">Cancel</button><button class="btn btn-primary" onclick="DatabasesPage.createDb()">Create</button>`);
    },

    async createDb() {
        const name = document.getElementById('new-db-name').value;
        const type = document.getElementById('new-db-type').value;
        if (!name) { Toast.warning('Required', 'Database name is required'); return; }
        try {
            await API.post(`/api/databases/${type}/databases`, { name });
            Modal.close();
            Toast.success('Created', `Database ${name} created`);
            this.loadDatabases();
        } catch (err) { Toast.error('Error', err.message); }
    },

    deleteDb(name) {
        Modal.confirm('Delete Database', `Delete MySQL database <strong>${name}</strong>? This cannot be undone.`, async () => {
            try { await API.delete(`/api/databases/mysql/databases/${name}`); Toast.success('Deleted', `Database ${name} deleted`); this.loadDatabases(); } catch (err) { Toast.error('Error', err.message); }
        }, 'Delete', true);
    },

    deleteMongoDb(name) {
        Modal.confirm('Delete Database', `Delete MongoDB database <strong>${name}</strong>?`, async () => {
            try { await API.delete(`/api/databases/mongodb/databases/${name}`); Toast.success('Deleted', `Database ${name} deleted`); this.loadDatabases(); } catch (err) { Toast.error('Error', err.message); }
        }, 'Delete', true);
    },

    importDb(name) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.sql';
        input.onchange = async e => {
            const file = e.target.files[0];
            if (!file) return;
            const formData = new FormData();
            formData.append('file', file);
            Toast.success('Importing', 'Import started, please wait...', 5000);
            try {
                const res = await fetch(`/api/databases/mysql/databases/${name}/import`, {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + API.token },
                    body: formData
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.detail || 'Import failed');
                Toast.success('Imported', data.message);
                this.loadDatabases();
            } catch (err) {
                Toast.error('Error', err.message);
            }
        };
        input.click();
    },

    importMongoDb(name) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.gz';
        input.onchange = async e => {
            const file = e.target.files[0];
            if (!file) return;
            const formData = new FormData();
            formData.append('file', file);
            Toast.success('Importing', 'Import started, please wait...', 5000);
            try {
                const res = await fetch(`/api/databases/mongodb/databases/${name}/import`, {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + API.token },
                    body: formData
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.detail || 'Import failed');
                Toast.success('Imported', data.message);
                this.loadDatabases();
            } catch (err) {
                Toast.error('Error', err.message);
            }
        };
        input.click();
    },

    destroy() {}
};
