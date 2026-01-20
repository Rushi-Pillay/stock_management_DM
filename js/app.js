/**
 * App Module - Main Application Controller
 * 
 * Handles:
 * - Navigation between views
 * - Event binding
 * - Business logic for inventory operations
 * - Integration between Scanner, Storage, and UI modules
 */

const App = (function () {
    // Currently selected item for detail/sell operations
    let currentItem = null;

    /**
     * Initialize the application
     */
    function init() {
        console.log('🚀 Stock Manager initializing...');

        // Bind all event listeners
        bindNavigationEvents();
        bindScannerEvents();
        bindSearchEvents();
        bindInventoryEvents();
        bindModalEvents();
        bindFormEvents();

        // Load initial inventory
        loadInventory();

        // Check scanner support
        if (!Scanner.isSupported()) {
            document.getElementById('start-scanner-btn').textContent = 'Camera not supported';
            document.getElementById('start-scanner-btn').disabled = true;
        }

        console.log('✅ Stock Manager ready!');
    }

    /**
     * Bind navigation tab events
     */
    function bindNavigationEvents() {
        const navButtons = document.querySelectorAll('.nav-btn');

        navButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const viewId = btn.dataset.view;
                UI.switchView(viewId);

                // Stop scanner if leaving scan view
                if (viewId !== 'scan-view' && Scanner.isActive()) {
                    Scanner.stop();
                }

                // Refresh inventory when switching to inventory view
                if (viewId === 'inventory-view') {
                    loadInventory();
                }
            });
        });
    }

    /**
     * Bind scanner-related events
     */
    function bindScannerEvents() {
        // Start scanner button
        document.getElementById('start-scanner-btn').addEventListener('click', () => {
            Scanner.start(handleBarcodeDetected)
                .then(() => {
                    UI.showToast('Scanner active - point at barcode', 'success');
                })
                .catch(err => {
                    UI.showToast(err.message, 'error');
                });
        });

        // Stop scanner button
        document.getElementById('stop-scanner-btn').addEventListener('click', () => {
            Scanner.stop();
            UI.showToast('Scanner stopped');
        });

        // Manual barcode lookup
        document.getElementById('manual-lookup-btn').addEventListener('click', () => {
            const barcode = document.getElementById('manual-barcode').value.trim();
            if (barcode) {
                handleBarcodeDetected(barcode);
                document.getElementById('manual-barcode').value = '';
            } else {
                UI.showToast('Please enter a barcode', 'warning');
            }
        });

        // Enter key for manual barcode
        document.getElementById('manual-barcode').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('manual-lookup-btn').click();
            }
        });
    }

    /**
     * Handle detected barcode or manual lookup
     * @param {string} code - The detected barcode or search term
     */
    function handleBarcodeDetected(code) {
        UI.showToast(`Looking up: ${code}`, 'success');

        // First try exact barcode match
        Storage.getItemByBarcode(code)
            .then(item => {
                if (item) {
                    // Exact barcode match found
                    showItemDetail(item);
                } else {
                    // No exact barcode match - search by description and stock number
                    return Storage.searchItems(code).then(items => {
                        if (items.length === 1) {
                            // Single match found - show details
                            showItemDetail(items[0]);
                        } else if (items.length > 1) {
                            // Multiple matches - switch to search view with results
                            UI.switchView('search-view');
                            document.getElementById('search-input').value = code;
                            document.getElementById('clear-search-btn').style.display = 'flex';
                            const resultsContainer = document.getElementById('search-results');
                            resultsContainer.innerHTML = items.map(i => UI.renderItemCard(i)).join('');
                            bindItemCardEvents(resultsContainer);
                            UI.showToast(`Found ${items.length} matching items`, 'success');
                        } else {
                            // No matches at all - prompt to add new
                            UI.showToast('Item not found - Add it to inventory?', 'warning');
                            UI.populateItemForm(null, code);
                            UI.showModal('item-modal');
                        }
                    });
                }
            })
            .catch(err => {
                console.error('Error looking up item:', err);
                UI.showToast('Error looking up item', 'error');
            });
    }

    /**
     * Bind search-related events
     */
    function bindSearchEvents() {
        const searchInput = document.getElementById('search-input');
        const clearBtn = document.getElementById('clear-search-btn');
        const resultsContainer = document.getElementById('search-results');

        let searchTimeout = null;

        // Search input with debounce
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value;

            // Show/hide clear button
            clearBtn.style.display = query ? 'flex' : 'none';

            // Debounce search
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                performSearch(query);
            }, 300);
        });

        // Clear search
        clearBtn.addEventListener('click', () => {
            searchInput.value = '';
            clearBtn.style.display = 'none';
            resultsContainer.innerHTML = '<p class="placeholder-text">Start typing to search inventory...</p>';
        });
    }

    /**
     * Perform search and display results
     * @param {string} query - Search query
     */
    function performSearch(query) {
        const resultsContainer = document.getElementById('search-results');

        if (!query.trim()) {
            resultsContainer.innerHTML = '<p class="placeholder-text">Start typing to search inventory...</p>';
            return;
        }

        Storage.searchItems(query)
            .then(items => {
                if (items.length === 0) {
                    resultsContainer.innerHTML = UI.renderEmptyState(
                        '🔍',
                        `No items found for "${query}"`,
                        true
                    );

                    // Bind add button in empty state
                    const addBtn = resultsContainer.querySelector('.add-new-from-empty');
                    if (addBtn) {
                        addBtn.addEventListener('click', () => {
                            UI.clearItemForm();
                            UI.showModal('item-modal');
                        });
                    }
                } else {
                    resultsContainer.innerHTML = items.map(item => UI.renderItemCard(item)).join('');
                    bindItemCardEvents(resultsContainer);
                }
            })
            .catch(err => {
                console.error('Search error:', err);
                UI.showToast('Search failed', 'error');
            });
    }

    /**
     * Bind inventory view events
     */
    function bindInventoryEvents() {
        // Add item button
        document.getElementById('add-item-btn').addEventListener('click', () => {
            UI.clearItemForm();
            UI.showModal('item-modal');
        });
    }

    /**
     * Load and display inventory
     */
    function loadInventory() {
        const listContainer = document.getElementById('inventory-list');

        Storage.getAllItems()
            .then(items => {
                if (items.length === 0) {
                    listContainer.innerHTML = UI.renderEmptyState(
                        '📦',
                        'No items in inventory yet',
                        true
                    );

                    // Bind add button in empty state
                    const addBtn = listContainer.querySelector('.add-new-from-empty');
                    if (addBtn) {
                        addBtn.addEventListener('click', () => {
                            UI.clearItemForm();
                            UI.showModal('item-modal');
                        });
                    }
                } else {
                    // Sort by description
                    items.sort((a, b) => a.description.localeCompare(b.description));
                    listContainer.innerHTML = items.map(item => UI.renderItemCard(item)).join('');
                    bindItemCardEvents(listContainer);
                }
            })
            .catch(err => {
                console.error('Error loading inventory:', err);
                UI.showToast('Failed to load inventory', 'error');
            });
    }

    /**
     * Bind click events to item cards
     * @param {Element} container - Container with item cards
     */
    function bindItemCardEvents(container) {
        container.querySelectorAll('.item-card').forEach(card => {
            card.addEventListener('click', () => {
                const itemId = card.dataset.itemId;
                Storage.getItemById(itemId)
                    .then(item => {
                        if (item) {
                            showItemDetail(item);
                        }
                    });
            });
        });
    }

    /**
     * Show item detail modal
     * @param {Object} item - Item to display
     */
    function showItemDetail(item) {
        currentItem = item;
        document.getElementById('item-details').innerHTML = UI.renderItemDetails(item);
        UI.showModal('detail-modal');
    }

    /**
     * Bind modal events (close buttons, backdrop clicks)
     */
    function bindModalEvents() {
        // Close buttons
        document.querySelectorAll('.close-modal-btn, .cancel-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                UI.hideAllModals();
            });
        });

        // Backdrop click to close
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    UI.hideAllModals();
                }
            });
        });

        // Edit button in detail modal
        document.getElementById('edit-item-btn').addEventListener('click', () => {
            if (currentItem) {
                UI.hideModal('detail-modal');
                UI.populateItemForm(currentItem);
                UI.showModal('item-modal');
            }
        });

        // Sell button in detail modal
        document.getElementById('sell-item-btn').addEventListener('click', () => {
            if (currentItem) {
                if (currentItem.quantity === 0) {
                    UI.showToast('Item is out of stock!', 'error');
                    return;
                }
                UI.hideModal('detail-modal');
                UI.setupSellModal(currentItem);
                UI.showModal('sell-modal');
            }
        });
    }

    /**
     * Bind form submission events
     */
    function bindFormEvents() {
        // Item form submission
        document.getElementById('item-form').addEventListener('submit', (e) => {
            e.preventDefault();
            saveItem();
        });

        // Sell form submission
        document.getElementById('sell-form').addEventListener('submit', (e) => {
            e.preventDefault();
            processSale();
        });
    }

    /**
     * Save item (add or update)
     */
    function saveItem() {
        const formData = UI.getFormData();

        // Validation
        if (!formData.stockNumber || !formData.supplier || !formData.description) {
            UI.showToast('Please fill in all required fields', 'error');
            return;
        }

        const isUpdate = !!formData.id;
        const operation = isUpdate ? Storage.updateItem(formData) : Storage.addItem(formData);

        operation
            .then(item => {
                UI.hideAllModals();
                UI.clearItemForm();
                UI.showToast(isUpdate ? 'Item updated!' : 'Item added!', 'success');
                loadInventory();
            })
            .catch(err => {
                console.error('Error saving item:', err);
                UI.showToast('Failed to save item', 'error');
            });
    }

    /**
     * Process stock removal/sale
     */
    function processSale() {
        const itemId = document.getElementById('sell-item-id').value;
        const quantity = parseInt(document.getElementById('sell-quantity').value);

        if (!quantity || quantity < 1) {
            UI.showToast('Please enter a valid quantity', 'error');
            return;
        }

        Storage.removeStock(itemId, quantity)
            .then(result => {
                if (result.success) {
                    UI.hideAllModals();
                    UI.showToast(`Removed ${result.removed} unit(s). New stock: ${result.item.quantity}`, 'success');
                    loadInventory();
                } else {
                    UI.showToast(result.error, 'error');
                }
            })
            .catch(err => {
                console.error('Error processing sale:', err);
                UI.showToast('Failed to process sale', 'error');
            });
    }

    // Public API
    return {
        init
    };
})();

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
