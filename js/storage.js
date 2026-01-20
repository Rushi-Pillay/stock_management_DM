/**
 * Storage Module - Data Layer Abstraction
 * 
 * This module provides a Promise-based interface for data operations.
 * Currently uses localStorage, but can be easily adapted to use a 
 * REST API, Firebase, or any other backend by modifying this file only.
 * 
 * Data Structure:
 * {
 *   id: string,
 *   barcode: string | null,
 *   stockNumber: string,
 *   supplier: string,
 *   description: string,
 *   costPrice: number,
 *   sellingPrice: number,
 *   quantity: number,
 *   createdAt: string (ISO date),
 *   updatedAt: string (ISO date)
 * }
 */

const Storage = (function() {
    const STORAGE_KEY = 'stock_manager_inventory';
    
    /**
     * Get all items from storage
     * @returns {Promise<Array>} Array of inventory items
     */
    function getAllItems() {
        return new Promise((resolve) => {
            try {
                const data = localStorage.getItem(STORAGE_KEY);
                const items = data ? JSON.parse(data) : [];
                resolve(items);
            } catch (error) {
                console.error('Error reading from storage:', error);
                resolve([]);
            }
        });
    }
    
    /**
     * Save all items to storage
     * @param {Array} items - Array of items to save
     * @returns {Promise<void>}
     */
    function saveAllItems(items) {
        return new Promise((resolve, reject) => {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
                resolve();
            } catch (error) {
                console.error('Error saving to storage:', error);
                reject(error);
            }
        });
    }
    
    /**
     * Get a single item by its ID
     * @param {string} id - Item ID
     * @returns {Promise<Object|null>} Item or null if not found
     */
    function getItemById(id) {
        return getAllItems().then(items => {
            return items.find(item => item.id === id) || null;
        });
    }
    
    /**
     * Get a single item by its barcode
     * @param {string} barcode - Barcode to search for
     * @returns {Promise<Object|null>} Item or null if not found
     */
    function getItemByBarcode(barcode) {
        return getAllItems().then(items => {
            return items.find(item => item.barcode === barcode) || null;
        });
    }
    
    /**
     * Search items by description, stock number, or supplier
     * @param {string} query - Search query
     * @returns {Promise<Array>} Matching items
     */
    function searchItems(query) {
        return getAllItems().then(items => {
            if (!query || query.trim() === '') {
                return [];
            }
            
            const searchTerm = query.toLowerCase().trim();
            
            return items.filter(item => {
                return (
                    item.description.toLowerCase().includes(searchTerm) ||
                    item.stockNumber.toLowerCase().includes(searchTerm) ||
                    item.supplier.toLowerCase().includes(searchTerm) ||
                    (item.barcode && item.barcode.toLowerCase().includes(searchTerm))
                );
            });
        });
    }
    
    /**
     * Add a new item to inventory
     * @param {Object} itemData - Item data (without id, createdAt, updatedAt)
     * @returns {Promise<Object>} The created item with generated fields
     */
    function addItem(itemData) {
        return getAllItems().then(items => {
            const newItem = {
                id: generateId(),
                barcode: itemData.barcode || null,
                stockNumber: itemData.stockNumber,
                supplier: itemData.supplier,
                description: itemData.description,
                costPrice: parseFloat(itemData.costPrice) || 0,
                sellingPrice: parseFloat(itemData.sellingPrice) || 0,
                quantity: parseInt(itemData.quantity) || 0,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            items.push(newItem);
            return saveAllItems(items).then(() => newItem);
        });
    }
    
    /**
     * Update an existing item
     * @param {Object} itemData - Item data including id
     * @returns {Promise<Object|null>} Updated item or null if not found
     */
    function updateItem(itemData) {
        return getAllItems().then(items => {
            const index = items.findIndex(item => item.id === itemData.id);
            
            if (index === -1) {
                return null;
            }
            
            items[index] = {
                ...items[index],
                barcode: itemData.barcode || items[index].barcode,
                stockNumber: itemData.stockNumber || items[index].stockNumber,
                supplier: itemData.supplier || items[index].supplier,
                description: itemData.description || items[index].description,
                costPrice: itemData.costPrice !== undefined 
                    ? parseFloat(itemData.costPrice) 
                    : items[index].costPrice,
                sellingPrice: itemData.sellingPrice !== undefined 
                    ? parseFloat(itemData.sellingPrice) 
                    : items[index].sellingPrice,
                quantity: itemData.quantity !== undefined 
                    ? parseInt(itemData.quantity) 
                    : items[index].quantity,
                updatedAt: new Date().toISOString()
            };
            
            return saveAllItems(items).then(() => items[index]);
        });
    }
    
    /**
     * Remove/deduct stock from an item
     * @param {string} id - Item ID
     * @param {number} quantity - Quantity to remove
     * @returns {Promise<Object>} Result with success status and updated item
     */
    function removeStock(id, quantity) {
        return getAllItems().then(items => {
            const index = items.findIndex(item => item.id === id);
            
            if (index === -1) {
                return { success: false, error: 'Item not found' };
            }
            
            const item = items[index];
            const removeQty = parseInt(quantity) || 0;
            
            if (removeQty <= 0) {
                return { success: false, error: 'Invalid quantity' };
            }
            
            if (item.quantity < removeQty) {
                return { 
                    success: false, 
                    error: `Not enough stock. Available: ${item.quantity}` 
                };
            }
            
            items[index] = {
                ...item,
                quantity: item.quantity - removeQty,
                updatedAt: new Date().toISOString()
            };
            
            return saveAllItems(items).then(() => ({
                success: true,
                item: items[index],
                removed: removeQty
            }));
        });
    }
    
    /**
     * Delete an item from inventory
     * @param {string} id - Item ID
     * @returns {Promise<boolean>} True if deleted, false if not found
     */
    function deleteItem(id) {
        return getAllItems().then(items => {
            const filteredItems = items.filter(item => item.id !== id);
            
            if (filteredItems.length === items.length) {
                return false; // Item not found
            }
            
            return saveAllItems(filteredItems).then(() => true);
        });
    }
    
    /**
     * Generate a unique ID
     * @returns {string} Unique identifier
     */
    function generateId() {
        return 'item_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    /**
     * Get inventory statistics
     * @returns {Promise<Object>} Stats object
     */
    function getStats() {
        return getAllItems().then(items => {
            return {
                totalItems: items.length,
                totalStock: items.reduce((sum, item) => sum + item.quantity, 0),
                totalValue: items.reduce((sum, item) => sum + (item.costPrice * item.quantity), 0),
                lowStockItems: items.filter(item => item.quantity > 0 && item.quantity <= 5).length,
                outOfStockItems: items.filter(item => item.quantity === 0).length
            };
        });
    }
    
    /**
     * Clear all inventory data (use with caution!)
     * @returns {Promise<void>}
     */
    function clearAll() {
        return new Promise((resolve) => {
            localStorage.removeItem(STORAGE_KEY);
            resolve();
        });
    }
    
    /**
     * Export all data as JSON string
     * @returns {Promise<string>} JSON string of all items
     */
    function exportData() {
        return getAllItems().then(items => JSON.stringify(items, null, 2));
    }
    
    /**
     * Import data from JSON string
     * @param {string} jsonString - JSON string of items
     * @returns {Promise<number>} Number of items imported
     */
    function importData(jsonString) {
        return new Promise((resolve, reject) => {
            try {
                const items = JSON.parse(jsonString);
                if (!Array.isArray(items)) {
                    throw new Error('Invalid data format');
                }
                saveAllItems(items).then(() => resolve(items.length));
            } catch (error) {
                reject(error);
            }
        });
    }
    
    // Public API
    return {
        getAllItems,
        getItemById,
        getItemByBarcode,
        searchItems,
        addItem,
        updateItem,
        removeStock,
        deleteItem,
        getStats,
        clearAll,
        exportData,
        importData
    };
})();

// Make Storage available globally
window.Storage = Storage;
