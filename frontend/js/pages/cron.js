/**
 * S Panel - Cron Jobs Page
 */
const CronPage = {
    async render() {
        const container = document.getElementById('page-content');
        container.innerHTML = `
            <div class="page-header">
                <h2>Cron Jobs</h2>
                <div class="page-header-actions">
                    <button class="btn btn-primary" onclick="CronPage.showCreateModal()"><i data-lucide="plus"></i> Add Cron Job</button>
                </div>
            </div>
            <div id="cron-content"><div class="loading-state"><div class="spinner"></div></div></div>
        `;
        lucide.createIcons({ nameAttr: 'data-lucide', node: container });
        await this.loadJobs();
    },

    async loadJobs() {
        const el = document.getElementById('cron-content');
        try {
            const jobs = await API.get('/api/cron/');
            if (jobs.length === 0) {
                el.innerHTML = `<div class="empty-state"><i data-lucide="clock" class="empty-state-icon"></i><h3>No Cron Jobs</h3><p>Add scheduled tasks to automate server maintenance.</p></div>`;
                lucide.createIcons({ nameAttr: 'data-lucide', node: el });
                return;
            }

            let html = '<div class="table-container"><table class="data-table"><thead><tr><th>User</th><th>Schedule</th><th>Command</th><th>Actions</th></tr></thead><tbody>';
            for (const job of jobs) {
                if (job.type === 'system_file') {
                    html += `
                        <tr>
                            <td><span class="badge badge-warning">System</span></td>
                            <td colspan="2" style="font-family:var(--font-mono);">${job.command}</td>
                            <td></td>
                        </tr>
                    `;
                } else {
                    html += `
                        <tr>
                            <td><span class="badge badge-info">${job.user}</span></td>
                            <td style="font-family:var(--font-mono);color:var(--accent-cyan);">${job.schedule}</td>
                            <td style="font-family:var(--font-mono);font-size:12px;max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${job.command}">${job.command}</td>
                            <td><button class="btn btn-sm btn-danger" onclick="CronPage.deleteJob('${btoa(job.raw)}', '${job.user}')"><i data-lucide="trash-2"></i></button></td>
                        </tr>
                    `;
                }
            }
            html += '</tbody></table></div>';
            el.innerHTML = html;
            lucide.createIcons({ nameAttr: 'data-lucide', node: el });
        } catch (err) { el.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${err.message}</p></div>`; }
    },

    showCreateModal() {
        Modal.open('Add Cron Job', `
            <div class="cron-builder">
                <div class="cron-field">
                    <input type="text" id="cron-min" value="*" oninput="CronPage.updatePreview()">
                    <label>Minute</label>
                </div>
                <div class="cron-field">
                    <input type="text" id="cron-hour" value="*" oninput="CronPage.updatePreview()">
                    <label>Hour</label>
                </div>
                <div class="cron-field">
                    <input type="text" id="cron-day" value="*" oninput="CronPage.updatePreview()">
                    <label>Day</label>
                </div>
                <div class="cron-field">
                    <input type="text" id="cron-month" value="*" oninput="CronPage.updatePreview()">
                    <label>Month</label>
                </div>
                <div class="cron-field">
                    <input type="text" id="cron-week" value="*" oninput="CronPage.updatePreview()">
                    <label>Weekday</label>
                </div>
            </div>
            <div class="cron-preview" id="cron-preview">* * * * *</div>
            
            <div class="form-group" style="margin-top:var(--space-4);margin-bottom:var(--space-4);">
                <label>Command Script</label>
                <input type="text" id="cron-cmd" placeholder="/usr/bin/php /var/www/script.php">
            </div>
            
            <div class="form-group">
                <label>Run as User</label>
                <select id="cron-user">
                    <option value="root">root</option>
                    <option value="www-data">www-data</option>
                    <option value="shubh">shubh</option>
                </select>
            </div>
        `, `
            <button class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
            <button class="btn btn-primary" onclick="CronPage.addJob()">Add Job</button>
        `);
    },

    updatePreview() {
        const min = document.getElementById('cron-min').value || '*';
        const hr = document.getElementById('cron-hour').value || '*';
        const day = document.getElementById('cron-day').value || '*';
        const mon = document.getElementById('cron-month').value || '*';
        const wk = document.getElementById('cron-week').value || '*';
        document.getElementById('cron-preview').textContent = `${min} ${hr} ${day} ${mon} ${wk}`;
    },

    async addJob() {
        const command = document.getElementById('cron-cmd').value;
        if (!command) { Toast.warning('Required', 'Command is required'); return; }
        
        try {
            await API.post('/api/cron/', {
                minute: document.getElementById('cron-min').value || '*',
                hour: document.getElementById('cron-hour').value || '*',
                day: document.getElementById('cron-day').value || '*',
                month: document.getElementById('cron-month').value || '*',
                weekday: document.getElementById('cron-week').value || '*',
                command,
                user: document.getElementById('cron-user').value
            });
            Modal.close();
            Toast.success('Added', 'Cron job added');
            this.loadJobs();
        } catch (err) { Toast.error('Error', err.message); }
    },

    deleteJob(encodedLine, user) {
        const line = atob(encodedLine);
        Modal.confirm('Delete Job', `Delete this cron job?`, async () => {
            try { 
                await API.delete(`/api/cron/?line=${encodeURIComponent(line)}&user=${user}`); 
                Toast.success('Deleted', 'Job removed'); 
                this.loadJobs(); 
            } catch (err) { Toast.error('Error', err.message); }
        }, 'Delete', true);
    },

    destroy() {}
};
