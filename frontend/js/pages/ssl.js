/**
 * S Panel - SSL Page
 */
const SslPage = {
    async render() {
        const container = document.getElementById('page-content');
        container.innerHTML = `
            <div class="page-header">
                <h2>SSL Certificates</h2>
                <div class="page-header-actions">
                    <button class="btn btn-secondary" onclick="SslPage.renewAll()"><i data-lucide="refresh-cw"></i> Renew All</button>
                    <button class="btn btn-primary" onclick="SslPage.showCreateModal()"><i data-lucide="plus"></i> Request Certificate</button>
                </div>
            </div>
            <div id="ssl-content"><div class="loading-state"><div class="spinner"></div></div></div>
        `;
        lucide.createIcons({ nameAttr: 'data-lucide', node: container });
        await this.loadCerts();
    },

    async loadCerts() {
        const el = document.getElementById('ssl-content');
        try {
            const certs = await API.get('/api/ssl/certificates');
            if (certs.length === 0) {
                el.innerHTML = `<div class="empty-state"><i data-lucide="shield-check" class="empty-state-icon"></i><h3>No Certificates</h3><p>Secure your websites with Let's Encrypt or Self-Signed certificates.</p></div>`;
                lucide.createIcons({ nameAttr: 'data-lucide', node: el });
                return;
            }

            let html = '';
            for (const cert of certs) {
                const isLetsEncrypt = cert.type === "Let's Encrypt";
                html += `
                    <div class="cert-card">
                        <div class="cert-icon" style="background:${isLetsEncrypt ? 'var(--success-bg)' : 'var(--warning-bg)'};color:${isLetsEncrypt ? 'var(--success)' : 'var(--warning)'}">
                            <i data-lucide="lock"></i>
                        </div>
                        <div class="cert-info">
                            <div class="cert-domain">${cert.domain} <span class="badge ${isLetsEncrypt ? 'badge-success' : 'badge-warning'}" style="margin-left:var(--space-2);">${cert.type}</span></div>
                            <div class="cert-meta">
                                <span><i data-lucide="calendar" style="width:12px;height:12px;margin-right:4px;"></i> Expires: ${cert.expiry || 'Unknown'}</span>
                                ${cert.auto_renew ? '<span><i data-lucide="refresh-cw" style="width:12px;height:12px;margin-right:4px;"></i> Auto-renew enabled</span>' : ''}
                            </div>
                        </div>
                        <div class="cert-actions">
                            <button class="btn btn-sm btn-danger" onclick="SslPage.deleteCert('${cert.domain}')"><i data-lucide="trash-2"></i> Delete</button>
                        </div>
                    </div>
                `;
            }
            el.innerHTML = html;
            lucide.createIcons({ nameAttr: 'data-lucide', node: el });
        } catch (err) { el.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${err.message}</p></div>`; }
    },

    showCreateModal() {
        Modal.open('Request SSL Certificate', `
            <div class="tabs">
                <button class="tab active" onclick="SslPage.switchType('letsencrypt', this)">Let's Encrypt</button>
                <button class="tab" onclick="SslPage.switchType('selfsigned', this)">Self-Signed</button>
            </div>
            
            <div id="ssl-form-letsencrypt">
                <div class="form-group" style="margin-bottom:var(--space-4);">
                    <label>Domain Name</label>
                    <input type="text" id="le-domain" placeholder="example.com">
                </div>
                <div class="form-group">
                    <label>Email (for renewal notices)</label>
                    <input type="email" id="le-email" placeholder="admin@example.com">
                </div>
                <p style="font-size:var(--text-xs);color:var(--text-tertiary);margin-top:var(--space-3);">Note: Domain must already point to this server's IP address.</p>
            </div>
            
            <div id="ssl-form-selfsigned" style="display:none;">
                <div class="form-group" style="margin-bottom:var(--space-4);">
                    <label>Domain Name</label>
                    <input type="text" id="ss-domain" placeholder="example.com">
                </div>
                <div class="form-group">
                    <label>Validity (Days)</label>
                    <input type="number" id="ss-days" value="365">
                </div>
            </div>
        `, `
            <button class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
            <button class="btn btn-primary" onclick="SslPage.requestCert()" id="ssl-submit-btn">Request</button>
        `);
    },
    
    currentType: 'letsencrypt',
    
    switchType(type, el) {
        this.currentType = type;
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        el.classList.add('active');
        document.getElementById('ssl-form-letsencrypt').style.display = type === 'letsencrypt' ? 'block' : 'none';
        document.getElementById('ssl-form-selfsigned').style.display = type === 'selfsigned' ? 'block' : 'none';
        document.getElementById('ssl-submit-btn').textContent = type === 'letsencrypt' ? 'Request' : 'Generate';
    },

    async requestCert() {
        const btn = document.getElementById('ssl-submit-btn');
        const origText = btn.textContent;
        btn.disabled = true;
        btn.innerHTML = '<span class="btn-loader"></span> Processing...';
        
        try {
            if (this.currentType === 'letsencrypt') {
                const domain = document.getElementById('le-domain').value;
                if (!domain) throw new Error('Domain is required');
                await API.post('/api/ssl/letsencrypt', { domain, email: document.getElementById('le-email').value });
                Toast.success('Success', `Let's Encrypt certificate issued for ${domain}`);
            } else {
                const domain = document.getElementById('ss-domain').value;
                if (!domain) throw new Error('Domain is required');
                await API.post('/api/ssl/self-signed', { domain, days: parseInt(document.getElementById('ss-days').value) });
                Toast.success('Success', `Self-signed certificate generated for ${domain}`);
            }
            Modal.close();
            this.loadCerts();
        } catch (err) { 
            Toast.error('Error', err.message); 
            btn.disabled = false;
            btn.textContent = origText;
        }
    },

    deleteCert(domain) {
        Modal.confirm('Delete Certificate', `Are you sure you want to delete the certificate for <strong>${domain}</strong>?`, async () => {
            try { await API.delete(`/api/ssl/${domain}`); Toast.success('Deleted', 'Certificate removed'); this.loadCerts(); } catch (err) { Toast.error('Error', err.message); }
        }, 'Delete', true);
    },
    
    async renewAll() {
        try {
            Toast.info('Renewing', 'Attempting to renew Let\'s Encrypt certificates...');
            await API.post('/api/ssl/renew');
            Toast.success('Complete', 'Certificate renewal process finished');
            this.loadCerts();
        } catch (err) { Toast.error('Error', err.message); }
    },

    destroy() {}
};
