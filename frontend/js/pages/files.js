/**
 * S Panel - File Manager Page
 */
const FilesPage = {
    currentPath: '/',

    async render() {
        const container = document.getElementById('page-content');
        container.innerHTML = `
            <div class="page-header">
                <h2>File Manager</h2>
                <div class="page-header-actions">
                    <button class="btn btn-sm btn-secondary" onclick="FilesPage.showCreateModal(true)"><i data-lucide="folder-plus"></i> New Folder</button>
                    <button class="btn btn-sm btn-secondary" onclick="FilesPage.showCreateModal(false)"><i data-lucide="file-plus"></i> New File</button>
                    <button class="btn btn-sm btn-primary" onclick="FilesPage.showUploadModal()"><i data-lucide="upload"></i> Upload</button>
                </div>
            </div>
            <div class="file-manager">
                <div class="file-toolbar">
                    <button class="btn btn-icon btn-ghost" onclick="FilesPage.goUp()" title="Go Up"><i data-lucide="arrow-up"></i></button>
                    <button class="btn btn-icon btn-ghost" onclick="FilesPage.refresh()" title="Refresh"><i data-lucide="refresh-cw"></i></button>
                    <div class="file-path-bar" id="file-breadcrumb"></div>
                </div>
                <div class="file-list" id="file-list"><div class="loading-state"><div class="spinner"></div></div></div>
            </div>
        `;
        lucide.createIcons({ nameAttr: 'data-lucide', node: container });
        await this.loadDirectory('/');
    },

    async loadDirectory(path) {
        this.currentPath = path;
        const listEl = document.getElementById('file-list');
        const breadEl = document.getElementById('file-breadcrumb');

        try {
            const result = await API.get(`/api/files/list?path=${encodeURIComponent(path)}`);

            // Breadcrumb
            const parts = path.split('/').filter(Boolean);
            let breadHtml = `<span class="file-path-segment" onclick="FilesPage.loadDirectory('/')">/</span>`;
            let buildPath = '';
            for (const part of parts) {
                buildPath += '/' + part;
                const p = buildPath;
                breadHtml += `<span class="file-path-separator">/</span><span class="file-path-segment" onclick="FilesPage.loadDirectory('${p}')">${part}</span>`;
            }
            breadEl.innerHTML = breadHtml;

            // File list
            if (result.entries.length === 0) {
                listEl.innerHTML = `<div class="empty-state"><i data-lucide="folder-open" class="empty-state-icon"></i><h3>Empty Directory</h3></div>`;
                lucide.createIcons({ nameAttr: 'data-lucide', node: listEl });
                return;
            }

            let html = '';
            for (const entry of result.entries) {
                const icon = entry.is_directory ? 'folder' : this.getFileIcon(entry.extension);
                const iconClass = entry.is_directory ? 'folder' : 'file';
                const size = entry.is_directory ? '--' : DashboardPage.formatBytes(entry.size);
                const modified = entry.modified ? new Date(entry.modified).toLocaleDateString() : '';

                html += `
                    <div class="file-item" ondblclick="FilesPage.${entry.is_directory ? `loadDirectory('${entry.path}')` : `editFile('${entry.path}')`}" oncontextmenu="FilesPage.showContextMenu(event, '${entry.path}', ${entry.is_directory})">
                        <i data-lucide="${icon}" class="file-icon ${iconClass}"></i>
                        <span class="file-name">${entry.name}</span>
                        <div class="file-meta">
                            <span>${entry.permissions || ''}</span>
                            <span>${size}</span>
                            <span>${modified}</span>
                        </div>
                    </div>
                `;
            }
            listEl.innerHTML = html;
            lucide.createIcons({ nameAttr: 'data-lucide', node: listEl });
        } catch (err) {
            listEl.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${err.message}</p></div>`;
        }
    },

    getFileIcon(ext) {
        const icons = { '.js': 'file-code', '.py': 'file-code', '.html': 'file-code', '.css': 'file-code', '.json': 'file-json',
            '.md': 'file-text', '.txt': 'file-text', '.log': 'file-text', '.jpg': 'image', '.png': 'image', '.gif': 'image',
            '.zip': 'file-archive', '.tar': 'file-archive', '.gz': 'file-archive', '.pdf': 'file-text', '.sh': 'terminal' };
        return icons[ext] || 'file';
    },

    goUp() {
        if (this.currentPath === '/') return;
        const parent = this.currentPath.split('/').slice(0, -1).join('/') || '/';
        this.loadDirectory(parent);
    },

    refresh() { this.loadDirectory(this.currentPath); },

    async editFile(path) {
        try {
            const result = await API.get(`/api/files/read?path=${encodeURIComponent(path)}`);
            Modal.open(`Edit: ${path.split('/').pop()}`, `
                <textarea id="file-editor" style="width:100%;min-height:400px;font-family:var(--font-mono);font-size:13px;tab-size:4;">${result.content.replace(/</g, '&lt;')}</textarea>
            `, `
                <button class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
                <button class="btn btn-primary" onclick="FilesPage.saveFile('${path}')">Save</button>
            `, { wide: true });
        } catch (err) { Toast.error('Error', err.message); }
    },

    async saveFile(path) {
        const content = document.getElementById('file-editor').value;
        try {
            await API.put('/api/files/write', { path, content });
            Modal.close();
            Toast.success('Saved', 'File saved successfully');
        } catch (err) { Toast.error('Error', err.message); }
    },

    showCreateModal(isDir) {
        Modal.open(isDir ? 'New Folder' : 'New File', `
            <div class="form-group"><label>Name</label><input type="text" id="new-file-name" placeholder="${isDir ? 'folder_name' : 'filename.txt'}"></div>
        `, `<button class="btn btn-secondary" onclick="Modal.close()">Cancel</button><button class="btn btn-primary" onclick="FilesPage.createItem(${isDir})">Create</button>`);
    },

    async createItem(isDir) {
        const name = document.getElementById('new-file-name').value;
        if (!name) return;
        try {
            await API.post('/api/files/create', { path: `${this.currentPath}/${name}`.replace('//', '/'), is_directory: isDir });
            Modal.close();
            Toast.success('Created', `${isDir ? 'Folder' : 'File'} created`);
            this.refresh();
        } catch (err) { Toast.error('Error', err.message); }
    },

    showUploadModal() {
        Modal.open('Upload File', `
            <div class="form-group"><label>Select File</label><input type="file" id="upload-file-input" style="padding:var(--space-3);"></div>
            <p style="font-size:var(--text-xs);color:var(--text-tertiary);margin-top:var(--space-2);">Upload to: ${this.currentPath}</p>
        `, `<button class="btn btn-secondary" onclick="Modal.close()">Cancel</button><button class="btn btn-primary" onclick="FilesPage.uploadFile()">Upload</button>`);
    },

    async uploadFile() {
        const input = document.getElementById('upload-file-input');
        if (!input.files.length) return;
        const formData = new FormData();
        formData.append('file', input.files[0]);
        try {
            await API.upload(`/api/files/upload?path=${encodeURIComponent(this.currentPath)}`, formData);
            Modal.close();
            Toast.success('Uploaded', 'File uploaded successfully');
            this.refresh();
        } catch (err) { Toast.error('Error', err.message); }
    },

    showContextMenu(e, path, isDir) {
        e.preventDefault();
        const name = path.split('/').pop();
        Modal.open(`Actions: ${name}`, `
            <div style="display:flex;flex-direction:column;gap:var(--space-2);">
                ${!isDir ? `<button class="btn btn-secondary btn-block" onclick="FilesPage.editFile('${path}');"><i data-lucide="edit"></i> Edit</button>` : ''}
                <button class="btn btn-secondary btn-block" onclick="FilesPage.renameItem('${path}')"><i data-lucide="pencil"></i> Rename</button>
                <button class="btn btn-secondary btn-block" onclick="FilesPage.compressItem('${path}')"><i data-lucide="archive"></i> Compress</button>
                <button class="btn btn-danger btn-block" onclick="FilesPage.deleteItem('${path}')"><i data-lucide="trash-2"></i> Delete</button>
            </div>
        `);
    },

    renameItem(path) {
        const oldName = path.split('/').pop();
        Modal.open('Rename', `<div class="form-group"><label>New Name</label><input type="text" id="rename-input" value="${oldName}"></div>`,
            `<button class="btn btn-secondary" onclick="Modal.close()">Cancel</button><button class="btn btn-primary" onclick="FilesPage.doRename('${path}')">Rename</button>`);
    },

    async doRename(path) {
        try { await API.post('/api/files/rename', { path, new_name: document.getElementById('rename-input').value }); Modal.close(); Toast.success('Renamed', 'Item renamed'); this.refresh(); } catch (err) { Toast.error('Error', err.message); }
    },

    async compressItem(path) {
        try { await API.post('/api/files/compress', { path }); Modal.close(); Toast.success('Compressed', 'Archive created'); this.refresh(); } catch (err) { Toast.error('Error', err.message); }
    },

    deleteItem(path) {
        Modal.confirm('Delete', `Delete <strong>${path.split('/').pop()}</strong>?`, async () => {
            try { await API.delete(`/api/files/delete?path=${encodeURIComponent(path)}`); Toast.success('Deleted', 'Item deleted'); this.refresh(); } catch (err) { Toast.error('Error', err.message); }
        }, 'Delete', true);
    },

    destroy() {}
};
