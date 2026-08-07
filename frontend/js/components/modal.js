/**
 * S Panel - Modal Component
 */

const Modal = {
    overlay: null,
    container: null,
    titleEl: null,
    bodyEl: null,
    footerEl: null,
    closeBtn: null,

    init() {
        this.overlay = document.getElementById('modal-overlay');
        this.container = document.getElementById('modal-container');
        this.titleEl = document.getElementById('modal-title');
        this.bodyEl = document.getElementById('modal-body');
        this.footerEl = document.getElementById('modal-footer');
        this.closeBtn = document.getElementById('modal-close');

        this.closeBtn.addEventListener('click', () => this.close());
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) this.close();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.overlay.style.display !== 'none') {
                this.close();
            }
        });
    },

    open(title, bodyHtml, footerHtml = '', options = {}) {
        if (!this.overlay) this.init();

        this.titleEl.textContent = title;
        this.bodyEl.innerHTML = bodyHtml;
        this.footerEl.innerHTML = footerHtml;

        if (options.wide) {
            this.container.style.maxWidth = '800px';
        } else {
            this.container.style.maxWidth = '560px';
        }

        this.overlay.style.display = 'flex';
        lucide.createIcons({ nameAttr: 'data-lucide', node: this.container });

        // Focus first input
        setTimeout(() => {
            const firstInput = this.bodyEl.querySelector('input, textarea, select');
            if (firstInput) firstInput.focus();
        }, 100);
    },

    close() {
        if (this.overlay) {
            this.overlay.style.display = 'none';
            this.bodyEl.innerHTML = '';
            this.footerEl.innerHTML = '';
        }
    },

    confirm(title, message, onConfirm, confirmText = 'Confirm', danger = false) {
        const body = `<p style="color: var(--text-secondary); font-size: var(--text-sm);">${message}</p>`;
        const footer = `
            <button class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
            <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="modal-confirm-btn">${confirmText}</button>
        `;

        this.open(title, body, footer);

        document.getElementById('modal-confirm-btn').addEventListener('click', () => {
            this.close();
            onConfirm();
        });
    }
};
