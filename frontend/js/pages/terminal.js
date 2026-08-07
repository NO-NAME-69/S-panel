/**
 * S Panel - Terminal Page
 */
const TerminalPage = {
    term: null,
    fitAddon: null,
    webLinksAddon: null,
    ws: null,

    async render() {
        const container = document.getElementById('page-content');
        container.innerHTML = `
            <div class="page-header">
                <h2>Terminal</h2>
                <div class="page-header-actions">
                    <span class="chip" id="term-status" style="background:var(--warning-bg);color:var(--warning);"><i data-lucide="loader"></i> Connecting...</span>
                    <button class="btn btn-sm btn-secondary" onclick="TerminalPage.reconnect()"><i data-lucide="refresh-cw"></i> Reconnect</button>
                </div>
            </div>
            <div class="terminal-wrapper">
                <div class="terminal-header">
                    <div class="terminal-dots">
                        <div class="terminal-dot red"></div>
                        <div class="terminal-dot yellow"></div>
                        <div class="terminal-dot green"></div>
                    </div>
                    <div class="terminal-title">shubh@ubuntu: ~</div>
                    <div style="width: 48px;"></div>
                </div>
                <div class="terminal-body" id="terminal-container"></div>
            </div>
        `;
        lucide.createIcons({ nameAttr: 'data-lucide', node: container });

        // Initialize xterm.js
        setTimeout(() => this.initTerminal(), 100);
    },

    initTerminal() {
        this.term = new Terminal({
            cursorBlink: true,
            fontFamily: 'JetBrains Mono, Fira Code, monospace',
            fontSize: 14,
            theme: {
                background: '#000000',
                foreground: '#f8f8f2',
                cursor: '#f8f8f0',
                black: '#000000',
                red: '#ff5555',
                green: '#50fa7b',
                yellow: '#f1fa8c',
                blue: '#bd93f9',
                magenta: '#ff79c6',
                cyan: '#8be9fd',
                white: '#bfbfbf',
                brightBlack: '#4d4d4d',
                brightRed: '#ff6e6e',
                brightGreen: '#69ff94',
                brightYellow: '#ffffa5',
                brightBlue: '#d6acff',
                brightMagenta: '#ff92df',
                brightCyan: '#a4ffff',
                brightWhite: '#ffffff'
            }
        });

        this.fitAddon = new FitAddon.FitAddon();
        this.webLinksAddon = new WebLinksAddon.WebLinksAddon();

        this.term.loadAddon(this.fitAddon);
        this.term.loadAddon(this.webLinksAddon);

        const container = document.getElementById('terminal-container');
        this.term.open(container);
        this.fitAddon.fit();

        window.addEventListener('resize', this.handleResize.bind(this));

        this.connect();
    },

    handleResize() {
        if (this.fitAddon && this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.fitAddon.fit();
            const cols = this.term.cols;
            const rows = this.term.rows;
            this.ws.send(`\x1b[RESIZE:${cols},${rows}]`);
        }
    },

    connect() {
        if (this.ws) this.ws.close();

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        // Handle development vs production URL
        const host = API.baseUrl ? API.baseUrl.replace('http://', '').replace('https://', '') : window.location.host;
        
        this.ws = new WebSocket(`${protocol}//${host}/api/terminal/ws?token=${API.token}`);

        const statusEl = document.getElementById('term-status');

        this.ws.onopen = () => {
            if (statusEl) statusEl.innerHTML = '<i data-lucide="check" style="width:14px;height:14px;"></i> Connected';
            if (statusEl) { statusEl.style.background = 'var(--success-bg)'; statusEl.style.color = 'var(--success)'; }
            lucide.createIcons({ nameAttr: 'data-lucide', node: document.getElementById('page-header-actions') || document.body });
            
            // Send initial resize
            this.handleResize();
            this.term.focus();
        };

        this.ws.onmessage = (event) => {
            this.term.write(event.data);
        };

        this.ws.onclose = () => {
            if (statusEl) statusEl.innerHTML = '<i data-lucide="x" style="width:14px;height:14px;"></i> Disconnected';
            if (statusEl) { statusEl.style.background = 'var(--danger-bg)'; statusEl.style.color = 'var(--danger)'; }
            lucide.createIcons({ nameAttr: 'data-lucide', node: document.getElementById('page-header-actions') || document.body });
        };

        this.term.onData(data => {
            if (this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(data);
            }
        });
    },

    reconnect() {
        this.term.clear();
        this.connect();
    },

    destroy() {
        window.removeEventListener('resize', this.handleResize);
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        if (this.term) {
            this.term.dispose();
            this.term = null;
        }
    }
};
