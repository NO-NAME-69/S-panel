/**
 * S Panel - Data Table Component
 */

const DataTable = {
    create(containerId, options = {}) {
        const container = document.getElementById(containerId) || document.querySelector(containerId);
        if (!container) return null;

        const columns = options.columns || [];
        const data = options.data || [];
        const emptyMessage = options.emptyMessage || 'No data available';

        const table = {
            container,
            columns,
            data,

            render() {
                if (this.data.length === 0) {
                    this.container.innerHTML = `
                        <div class="empty-state">
                            <i data-lucide="inbox" class="empty-state-icon"></i>
                            <h3>No Data</h3>
                            <p>${emptyMessage}</p>
                        </div>
                    `;
                    lucide.createIcons({ nameAttr: 'data-lucide', node: this.container });
                    return;
                }

                let html = '<div class="table-container"><table class="data-table"><thead><tr>';
                
                for (const col of this.columns) {
                    html += `<th>${col.label}</th>`;
                }
                html += '</tr></thead><tbody>';

                for (const row of this.data) {
                    html += '<tr>';
                    for (const col of this.columns) {
                        const value = col.render ? col.render(row[col.key], row) : (row[col.key] || '');
                        html += `<td>${value}</td>`;
                    }
                    html += '</tr>';
                }

                html += '</tbody></table></div>';
                this.container.innerHTML = html;
                lucide.createIcons({ nameAttr: 'data-lucide', node: this.container });
            },

            setData(newData) {
                this.data = newData;
                this.render();
            }
        };

        table.render();
        return table;
    }
};
