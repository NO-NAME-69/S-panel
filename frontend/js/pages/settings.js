/**
 * S Panel - Settings Page
 */
const SettingsPage = {
    async render() {
        const container = document.getElementById('page-content');
        container.innerHTML = `
            <div class="page-header">
                <h2>Settings</h2>
            </div>
            
            <div class="settings-section">
                <h3>Account Settings</h3>
                <div class="settings-row">
                    <div class="settings-label">
                        <h4>Change Password</h4>
                        <p>Update your admin password.</p>
                    </div>
                    <button class="btn btn-secondary" onclick="SettingsPage.showPasswordModal()">Change Password</button>
                </div>
            </div>

            <div class="settings-section">
                <h3>Activity Log</h3>
                <div id="activity-log-content"><div class="loading-state"><div class="spinner"></div></div></div>
            </div>
        `;
        await this.loadActivity();
    },

    async loadActivity() {
        const el = document.getElementById('activity-log-content');
        try {
            const logs = await API.get('/api/auth/activity');
            if (logs.length === 0) {
                el.innerHTML = '<p style="color:var(--text-tertiary);">No activity logs found.</p>';
                return;
            }

            let html = '<div class="table-container"><table class="data-table"><thead><tr><th>Time</th><th>Action</th><th>Details</th><th>IP</th></tr></thead><tbody>';
            for (const log of logs) {
                html += `
                    <tr>
                        <td>${new Date(log.created_at + 'Z').toLocaleString()}</td>
                        <td><span class="badge badge-secondary">${log.action}</span></td>
                        <td>${log.details || '-'}</td>
                        <td>${log.ip_address || '-'}</td>
                    </tr>
                `;
            }
            html += '</tbody></table></div>';
            el.innerHTML = html;
        } catch (err) { el.innerHTML = `<p style="color:var(--danger);">${err.message}</p>`; }
    },

    showPasswordModal() {
        Modal.open('Change Password', `
            <div class="form-group" style="margin-bottom:var(--space-4);">
                <label>Current Password</label>
                <input type="password" id="current-pwd">
            </div>
            <div class="form-group" style="margin-bottom:var(--space-4);">
                <label>New Password</label>
                <input type="password" id="new-pwd">
            </div>
            <div class="form-group">
                <label>Confirm New Password</label>
                <input type="password" id="confirm-pwd">
            </div>
        `, `
            <button class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
            <button class="btn btn-primary" onclick="SettingsPage.changePassword()">Update Password</button>
        `);
    },

    async changePassword() {
        const current = document.getElementById('current-pwd').value;
        const newPwd = document.getElementById('new-pwd').value;
        const confirm = document.getElementById('confirm-pwd').value;

        if (!current || !newPwd || !confirm) { Toast.warning('Required', 'All fields are required'); return; }
        if (newPwd !== confirm) { Toast.error('Error', 'Passwords do not match'); return; }
        if (newPwd.length < 8) { Toast.warning('Weak Password', 'Password must be at least 8 characters'); return; }

        try {
            await API.put('/api/auth/password', { current_password: current, new_password: newPwd });
            Modal.close();
            Toast.success('Success', 'Password changed successfully');
            Auth.logout();
        } catch (err) { Toast.error('Error', err.message); }
    },

    destroy() {}
};
