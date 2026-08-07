/**
 * S Panel - Charts Component
 * Canvas-based charts for system monitoring.
 */

const Charts = {
    /**
     * Create a line chart that auto-updates.
     */
    createLineChart(canvas, options = {}) {
        const ctx = canvas.getContext('2d');
        const maxPoints = options.maxPoints || 60;
        const data = options.data || [];
        const color = options.color || '#6366f1';
        const label = options.label || '';
        const maxValue = options.maxValue || 100;

        const chart = {
            data: data,
            canvas: canvas,
            ctx: ctx,

            addPoint(value) {
                this.data.push(value);
                if (this.data.length > maxPoints) {
                    this.data.shift();
                }
                this.draw();
            },

            draw() {
                const w = canvas.width = canvas.offsetWidth * (window.devicePixelRatio || 1);
                const h = canvas.height = canvas.offsetHeight * (window.devicePixelRatio || 1);
                ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);

                const dw = canvas.offsetWidth;
                const dh = canvas.offsetHeight;
                const padding = { top: 10, right: 10, bottom: 25, left: 40 };
                const chartW = dw - padding.left - padding.right;
                const chartH = dh - padding.top - padding.bottom;

                ctx.clearRect(0, 0, dw, dh);

                // Grid lines
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
                ctx.lineWidth = 1;
                for (let i = 0; i <= 4; i++) {
                    const y = padding.top + (chartH / 4) * i;
                    ctx.beginPath();
                    ctx.moveTo(padding.left, y);
                    ctx.lineTo(dw - padding.right, y);
                    ctx.stroke();

                    // Y-axis labels
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                    ctx.font = '10px Inter';
                    ctx.textAlign = 'right';
                    const val = Math.round(maxValue - (maxValue / 4) * i);
                    ctx.fillText(val + (options.unit || '%'), padding.left - 6, y + 4);
                }

                if (this.data.length < 2) return;

                // Draw filled area
                const gradient = ctx.createLinearGradient(0, padding.top, 0, dh - padding.bottom);
                gradient.addColorStop(0, color + '40');
                gradient.addColorStop(1, color + '00');

                ctx.beginPath();
                ctx.moveTo(padding.left, dh - padding.bottom);

                for (let i = 0; i < this.data.length; i++) {
                    const x = padding.left + (chartW / (maxPoints - 1)) * i;
                    const y = padding.top + chartH - (this.data[i] / maxValue) * chartH;
                    if (i === 0) ctx.lineTo(x, y);
                    else ctx.lineTo(x, y);
                }

                ctx.lineTo(padding.left + (chartW / (maxPoints - 1)) * (this.data.length - 1), dh - padding.bottom);
                ctx.closePath();
                ctx.fillStyle = gradient;
                ctx.fill();

                // Draw line
                ctx.beginPath();
                ctx.strokeStyle = color;
                ctx.lineWidth = 2;
                ctx.lineJoin = 'round';
                ctx.lineCap = 'round';

                for (let i = 0; i < this.data.length; i++) {
                    const x = padding.left + (chartW / (maxPoints - 1)) * i;
                    const y = padding.top + chartH - (this.data[i] / maxValue) * chartH;
                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.stroke();

                // Glow effect on the last point
                if (this.data.length > 0) {
                    const lastX = padding.left + (chartW / (maxPoints - 1)) * (this.data.length - 1);
                    const lastY = padding.top + chartH - (this.data[this.data.length - 1] / maxValue) * chartH;

                    ctx.beginPath();
                    ctx.arc(lastX, lastY, 4, 0, Math.PI * 2);
                    ctx.fillStyle = color;
                    ctx.fill();

                    ctx.beginPath();
                    ctx.arc(lastX, lastY, 8, 0, Math.PI * 2);
                    ctx.fillStyle = color + '30';
                    ctx.fill();
                }

                // Label
                if (label) {
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                    ctx.font = '10px Inter';
                    ctx.textAlign = 'left';
                    ctx.fillText(label, padding.left, dh - 6);
                }
            }
        };

        return chart;
    },

    /**
     * Draw a circular/donut progress indicator.
     */
    drawCircularProgress(container, percentage, color = '#6366f1', size = 100) {
        const radius = (size - 16) / 2;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - (percentage / 100) * circumference;

        container.innerHTML = `
            <div class="circular-progress" style="width:${size}px; height:${size}px;">
                <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
                    <circle class="progress-bg" cx="${size/2}" cy="${size/2}" r="${radius}"/>
                    <circle class="progress-value" cx="${size/2}" cy="${size/2}" r="${radius}"
                        stroke="${color}"
                        stroke-dasharray="${circumference}"
                        stroke-dashoffset="${offset}"
                        style="transition: stroke-dashoffset 0.8s ease;"/>
                </svg>
                <div class="progress-text">${Math.round(percentage)}%</div>
            </div>
        `;
    }
};
