/**
 * S Panel - Dashboard Page
 * Real-time system monitoring dashboard.
 */

const DashboardPage = {
    eventSource: null,
    charts: {},
    refreshInterval: null,

    async render() {
        const container = document.getElementById('page-content');

        container.innerHTML = `
            <div class="page-header">
                <h2>Dashboard</h2>
                <div class="page-header-actions">
                    <span class="chip" id="dash-uptime"><i data-lucide="clock" style="width:14px;height:14px;"></i> Loading...</span>
                </div>
            </div>

            <!-- Stat Cards -->
            <div class="dashboard-grid" id="stat-cards">
                <div class="stat-card animate-slide-up" style="--stat-color: var(--primary); --stat-bg: var(--primary-light); animation-delay: 0.05s;">
                    <div class="stat-card-header">
                        <span class="stat-card-label">CPU Usage</span>
                        <div class="stat-card-icon"><i data-lucide="cpu"></i></div>
                    </div>
                    <div class="stat-card-value" id="dash-cpu">0%</div>
                    <div class="progress-bar"><div class="progress-fill" id="dash-cpu-bar" style="width:0%"></div></div>
                    <div class="stat-card-sub" id="dash-cpu-info">Loading...</div>
                </div>

                <div class="stat-card animate-slide-up" style="--stat-color: var(--accent-cyan); --stat-bg: rgba(34,211,238,0.1); animation-delay: 0.1s;">
                    <div class="stat-card-header">
                        <span class="stat-card-label">Memory</span>
                        <div class="stat-card-icon"><i data-lucide="memory-stick"></i></div>
                    </div>
                    <div class="stat-card-value" id="dash-mem">0%</div>
                    <div class="progress-bar"><div class="progress-fill" id="dash-mem-bar" style="width:0%"></div></div>
                    <div class="stat-card-sub" id="dash-mem-info">Loading...</div>
                </div>

                <div class="stat-card animate-slide-up" style="--stat-color: var(--accent-emerald); --stat-bg: rgba(52,211,153,0.1); animation-delay: 0.15s;">
                    <div class="stat-card-header">
                        <span class="stat-card-label">Disk Usage</span>
                        <div class="stat-card-icon"><i data-lucide="hard-drive"></i></div>
                    </div>
                    <div class="stat-card-value" id="dash-disk">0%</div>
                    <div class="progress-bar"><div class="progress-fill" id="dash-disk-bar" style="width:0%"></div></div>
                    <div class="stat-card-sub" id="dash-disk-info">Loading...</div>
                </div>

                <div class="stat-card animate-slide-up" style="--stat-color: var(--accent-amber); --stat-bg: rgba(251,191,36,0.1); animation-delay: 0.2s;">
                    <div class="stat-card-header">
                        <span class="stat-card-label">Network</span>
                        <div class="stat-card-icon"><i data-lucide="wifi"></i></div>
                    </div>
                    <div class="stat-card-value" id="dash-net">0 B/s</div>
                    <div class="stat-card-sub" id="dash-net-info">↑ 0 B &middot; ↓ 0 B</div>
                </div>
            </div>

            <!-- Charts -->
            <div class="dashboard-charts">
                <div class="chart-card animate-slide-up" style="animation-delay:0.25s;">
                    <div class="chart-card-header">
                        <span class="chart-card-title">CPU History</span>
                        <span class="chip" id="dash-cpu-live">Live</span>
                    </div>
                    <div class="chart-container"><canvas id="cpu-chart"></canvas></div>
                </div>
                <div class="chart-card animate-slide-up" style="animation-delay:0.3s;">
                    <div class="chart-card-header">
                        <span class="chart-card-title">Memory History</span>
                        <span class="chip" id="dash-mem-live">Live</span>
                    </div>
                    <div class="chart-container"><canvas id="mem-chart"></canvas></div>
                </div>
            </div>

            <!-- System Info -->
            <div class="system-info-grid" id="system-info-grid">
                <div class="info-card animate-slide-up" style="animation-delay:0.35s;">
                    <h3 style="font-size:var(--text-base);font-weight:600;margin-bottom:var(--space-4);">System Information</h3>
                    <div id="sys-info-content"><div class="loading-state"><div class="spinner"></div></div></div>
                </div>
                <div class="info-card animate-slide-up" style="animation-delay:0.4s;">
                    <h3 style="font-size:var(--text-base);font-weight:600;margin-bottom:var(--space-4);">Top Processes</h3>
                    <div id="top-processes"><div class="loading-state"><div class="spinner"></div></div></div>
                </div>
            </div>
        `;

        lucide.createIcons({ nameAttr: 'data-lucide', node: container });

        // Initialize charts
        this.charts.cpu = Charts.createLineChart(document.getElementById('cpu-chart'), {
            color: '#6366f1', label: 'CPU %', maxValue: 100
        });
        this.charts.mem = Charts.createLineChart(document.getElementById('mem-chart'), {
            color: '#22d3ee', label: 'Memory %', maxValue: 100
        });

        // Load data
        await this.loadSystemInfo();
        await this.loadStats();
        this.startStream();
    },

    async loadSystemInfo() {
        try {
            const info = await API.get('/api/system/info');
            const el = document.getElementById('sys-info-content');
            const upEl = document.getElementById('dash-uptime');

            if (upEl) upEl.innerHTML = `<i data-lucide="clock" style="width:14px;height:14px;"></i> ${info.uptime}`;

            if (el) {
                el.innerHTML = `
                    <div class="info-row"><span class="info-label">Hostname</span><span class="info-value">${info.hostname}</span></div>
                    <div class="info-row"><span class="info-label">OS</span><span class="info-value">${info.os}</span></div>
                    <div class="info-row"><span class="info-label">Architecture</span><span class="info-value">${info.architecture}</span></div>
                    <div class="info-row"><span class="info-label">CPU Cores</span><span class="info-value">${info.cpu_count} (${info.cpu_count_physical} physical)</span></div>
                    <div class="info-row"><span class="info-label">Total Memory</span><span class="info-value">${this.formatBytes(info.total_memory)}</span></div>
                    <div class="info-row"><span class="info-label">Total Swap</span><span class="info-value">${this.formatBytes(info.total_swap)}</span></div>
                    <div class="info-row"><span class="info-label">Python</span><span class="info-value">${info.python_version}</span></div>
                    <div class="info-row"><span class="info-label">Uptime</span><span class="info-value">${info.uptime}</span></div>
                `;
            }
            lucide.createIcons({ nameAttr: 'data-lucide', node: document.getElementById('page-content') });
        } catch (err) {
            console.error('Failed to load system info:', err);
        }
    },

    async loadStats() {
        try {
            const stats = await API.get('/api/system/stats');
            this.updateUI(stats);

            // Top processes
            const procEl = document.getElementById('top-processes');
            if (procEl && stats.top_processes) {
                let html = '';
                for (const proc of stats.top_processes.slice(0, 8)) {
                    html += `
                        <div class="info-row">
                            <span class="info-label" style="flex:2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${proc.name || 'N/A'}</span>
                            <span class="info-value" style="color:var(--accent-cyan);">${(proc.cpu_percent || 0).toFixed(1)}%</span>
                        </div>
                    `;
                }
                procEl.innerHTML = html || '<p style="color:var(--text-tertiary);font-size:var(--text-sm);">No active processes</p>';
            }
        } catch (err) {
            console.error('Failed to load stats:', err);
        }
    },

    startStream() {
        this.stopStream();

        const token = API.token;
        this.eventSource = new EventSource(`/api/system/stats/stream?token=${token}`);

        this.eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.updateLiveStats(data);
            } catch (e) {
                console.error('SSE parse error:', e);
            }
        };

        this.eventSource.onerror = () => {
            // Fallback to polling
            this.stopStream();
            this.refreshInterval = setInterval(() => this.loadStats(), 3000);
        };
    },

    stopStream() {
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
        }
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    },

    updateLiveStats(data) {
        const formatPct = (v) => parseFloat(Number(v).toFixed(2));
        
        // Update stat cards
        const cpuEl = document.getElementById('dash-cpu');
        const memEl = document.getElementById('dash-mem');
        const diskEl = document.getElementById('dash-disk');
        const netEl = document.getElementById('dash-net');

        if (cpuEl) cpuEl.textContent = formatPct(data.cpu) + '%';
        if (memEl) memEl.textContent = formatPct(data.memory) + '%';
        if (diskEl) diskEl.textContent = formatPct(data.disk) + '%';
        if (netEl) netEl.textContent = '↑ ' + this.formatSpeed(data.net_sent) + ' ↓ ' + this.formatSpeed(data.net_recv);

        // Update progress bars
        const cpuBar = document.getElementById('dash-cpu-bar');
        const memBar = document.getElementById('dash-mem-bar');
        const diskBar = document.getElementById('dash-disk-bar');

        if (cpuBar) cpuBar.style.width = formatPct(data.cpu) + '%';
        if (memBar) memBar.style.width = formatPct(data.memory) + '%';
        if (diskBar) diskBar.style.width = formatPct(data.disk) + '%';

        // Danger coloring
        if (cpuBar && data.cpu > 80) cpuBar.parentElement.classList.add('danger');
        else if (cpuBar) cpuBar.parentElement.classList.remove('danger');

        // Sub info
        const memInfo = document.getElementById('dash-mem-info');
        const diskInfo = document.getElementById('dash-disk-info');
        const netInfo = document.getElementById('dash-net-info');

        if (memInfo) memInfo.textContent = `${this.formatBytes(data.memory_used)} / ${this.formatBytes(data.memory_total)}`;
        if (diskInfo) diskInfo.textContent = `${this.formatBytes(data.disk_used)} / ${this.formatBytes(data.disk_total)}`;
        if (netInfo) netInfo.textContent = `Total: ↑ ${this.formatBytes(data.net_total_sent)} · ↓ ${this.formatBytes(data.net_total_recv)}`;

        // Header stats
        const headerCpu = document.getElementById('header-cpu');
        const headerMem = document.getElementById('header-mem');
        if (headerCpu) headerCpu.textContent = formatPct(data.cpu) + '%';
        if (headerMem) headerMem.textContent = formatPct(data.memory) + '%';

        // Charts
        if (this.charts.cpu) this.charts.cpu.addPoint(formatPct(data.cpu));
        if (this.charts.mem) this.charts.mem.addPoint(formatPct(data.memory));
    },

    updateUI(stats) {
        const data = {
            cpu: stats.cpu.percent,
            memory: stats.memory.percent,
            disk: stats.disk.percent,
            memory_used: stats.memory.used,
            memory_total: stats.memory.total,
            disk_used: stats.disk.used,
            disk_total: stats.disk.total,
            net_sent: 0,
            net_recv: 0,
            net_total_sent: stats.network.bytes_sent,
            net_total_recv: stats.network.bytes_recv
        };
        this.updateLiveStats(data);
    },

    formatBytes(bytes) {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    },

    formatSpeed(bytesPerSec) {
        return this.formatBytes(bytesPerSec) + '/s';
    },

    destroy() {
        this.stopStream();
    }
};
