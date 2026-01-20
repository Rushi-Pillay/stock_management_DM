/**
 * UI Module - User Interface Helpers
 * 
 * Provides utility functions for:
 * - Modal management
 * - Item card rendering
 * - Toast notifications
 * - Form population and clearing
 */

const UI = (function () {
    // Toast notification timeout reference
    let toastTimeout = null;

    /**
     * Show a toast notification
     * @param {string} message - Message to display
     * @param {string} type - Type: 'success', 'error', 'warning', or default
     * @param {number} duration - Duration in ms (default 3000)
     */
    function showToast(message, type = '', duration = 3000) {
        const toast = document.getElementById('toast');

        // Clear any existing timeout
        if (toastTimeout) {
            clearTimeout(toastTimeout);
        }

        // Remove existing classes
        toast.classList.remove('show', 'success', 'error', 'warning');

        // Set content and type
        toast.textContent = message;
        if (type) {
            toast.classList.add(type);
        }

        // Force reflow for animation
        toast.offsetHeight;

        // Show toast
        toast.classList.add('show');

        // Auto-hide
        toastTimeout = setTimeout(() => {
            toast.classList.remove('show');
        }, duration);
    }

    /**
     * Show a modal by ID
     * @param {string} modalId - Modal element ID
     */
    function showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    /**
     * Hide a modal by ID
     * @param {string} modalId - Modal element ID
     */
    function hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    /**
     * Hide all modals
     */
    function hideAllModals() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => modal.classList.remove('active'));
        document.body.style.overflow = '';
    }

    /**
     * Format currency value
     * @param {number} value - Value to format
     * @returns {string} Formatted currency string
     */
    function formatCurrency(value) {
        return 'R ' + parseFloat(value || 0).toFixed(2);
    }

    /**
     * Get stock status class based on quantity
     * @param {number} quantity - Stock quantity
     * @returns {string} CSS class name
     */
    function getStockClass(quantity) {
        if (quantity === 0) return 'out-of-stock';
        if (quantity <= 5) return 'low-stock';
        return '';
    }

    /**
     * Render an item card HTML
     * @param {Object} item - Item object
     * @returns {string} HTML string
     */
    function renderItemCard(item) {
        const stockClass = getStockClass(item.quantity);
        const stockText = item.quantity === 0 ? 'Out of Stock' : `${item.quantity} in stock`;

        return `
            <div class="item-card" data-item-id="${item.id}">
                <div class="item-card-header">
                    <span class="item-name">${escapeHtml(item.description)}</span>
                    <span class="item-stock ${stockClass}">${stockText}</span>
                </div>
                <div class="item-meta">
                    <span>📦 ${escapeHtml(item.stockNumber)}</span>
                    <span>🏭 ${escapeHtml(item.supplier)}</span>
                </div>
                <div class="item-prices">
                    <div class="price-tag">
                        <span class="label">Cost: </span>
                        <span class="value">${formatCurrency(item.costPrice)}</span>
                    </div>
                    <div class="price-tag">
                        <span class="label">Sell: </span>
                        <span class="value">${formatCurrency(item.sellingPrice)}</span>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render item details HTML
     * @param {Object} item - Item object
     * @returns {string} HTML string
     */
    function renderItemDetails(item) {
        const stockClass = getStockClass(item.quantity);

        return `
            <div class="detail-row">
                <span class="detail-label">Barcode</span>
                <span class="detail-value">${item.barcode || 'N/A'}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Stock Number</span>
                <span class="detail-value">${escapeHtml(item.stockNumber)}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Supplier</span>
                <span class="detail-value">${escapeHtml(item.supplier)}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Description</span>
                <span class="detail-value">${escapeHtml(item.description)}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Cost Price</span>
                <span class="detail-value">${formatCurrency(item.costPrice)}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Selling Price</span>
                <span class="detail-value text-success">${formatCurrency(item.sellingPrice)}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">In Stock</span>
                <span class="detail-value ${stockClass ? 'text-' + (stockClass === 'out-of-stock' ? 'danger' : 'warning') : 'text-success'}">${item.quantity}</span>
            </div>
        `;
    }

    /**
     * Render empty state HTML
     * @param {string} icon - Emoji icon
     * @param {string} message - Message text
     * @param {boolean} showAddButton - Whether to show add button
     * @returns {string} HTML string
     */
    function renderEmptyState(icon, message, showAddButton = false) {
        let html = `
            <div class="empty-state">
                <div class="empty-state-icon">${icon}</div>
                <p class="empty-state-text">${message}</p>
        `;

        if (showAddButton) {
            html += `<button class="btn btn-accent add-new-from-empty">➕ Add New Item</button>`;
        }

        html += `</div>`;
        return html;
    }

    /**
     * Populate item form with data
     * @param {Object} item - Item data (or null to clear)
     * @param {string} barcode - Optional barcode to pre-fill
     */
    function populateItemForm(item = null, barcode = null) {
        document.getElementById('item-id').value = item ? item.id : '';
        document.getElementById('item-barcode').value = item ? (item.barcode || '') : (barcode || '');
        document.getElementById('item-stock-number').value = item ? item.stockNumber : '';
        document.getElementById('item-supplier').value = item ? item.supplier : '';
        document.getElementById('item-description').value = item ? item.description : '';
        document.getElementById('item-cost-price').value = item ? item.costPrice : '';
        document.getElementById('item-selling-price').value = item ? item.sellingPrice : '';
        document.getElementById('item-quantity').value = item ? item.quantity : '';

        // Update modal title
        document.getElementById('modal-title').textContent = item ? 'Edit Item' : 'Add New Item';
    }

    /**
     * Get form data as object
     * @returns {Object} Form data object
     */
    function getFormData() {
        return {
            id: document.getElementById('item-id').value || null,
            barcode: document.getElementById('item-barcode').value.trim() || null,
            stockNumber: document.getElementById('item-stock-number').value.trim(),
            supplier: document.getElementById('item-supplier').value.trim(),
            description: document.getElementById('item-description').value.trim(),
            costPrice: document.getElementById('item-cost-price').value,
            sellingPrice: document.getElementById('item-selling-price').value,
            quantity: document.getElementById('item-quantity').value
        };
    }

    /**
     * Clear item form
     */
    function clearItemForm() {
        document.getElementById('item-form').reset();
        document.getElementById('item-id').value = '';
        document.getElementById('modal-title').textContent = 'Add New Item';
    }

    /**
     * Setup sell modal with item data
     * @param {Object} item - Item to sell from
     */
    function setupSellModal(item) {
        document.getElementById('sell-item-id').value = item.id;
        document.getElementById('sell-item-name').textContent = item.description;
        document.getElementById('sell-current-stock').innerHTML =
            `Current stock: <strong>${item.quantity}</strong>`;
        document.getElementById('sell-quantity').value = 1;
        document.getElementById('sell-quantity').max = item.quantity;
    }

    /**
     * Escape HTML to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }

    /**
     * Switch to a view
     * @param {string} viewId - View ID to show
     */
    function switchView(viewId) {
        // Hide all views
        document.querySelectorAll('.view').forEach(view => {
            view.classList.remove('active');
        });

        // Show target view
        const targetView = document.getElementById(viewId);
        if (targetView) {
            targetView.classList.add('active');
        }

        // Update nav buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.view === viewId) {
                btn.classList.add('active');
            }
        });
    }

    // Public API
    return {
        showToast,
        showModal,
        hideModal,
        hideAllModals,
        formatCurrency,
        getStockClass,
        renderItemCard,
        renderItemDetails,
        renderEmptyState,
        populateItemForm,
        getFormData,
        clearItemForm,
        setupSellModal,
        escapeHtml,
        switchView
    };
})();

// Make UI available globally
window.UI = UI;
