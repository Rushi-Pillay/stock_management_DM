/**
 * Storage Module - GitHub Gist Backend
 * 
 * This module provides a Promise-based interface for data operations
 * using GitHub Gist as the storage backend. Data is synced to a private
 * Gist file that persists across sessions and devices.
 * 
 * Authentication:
 * - GitHub Personal Access Token required (with 'gist' scope)
 * - Token is stored in sessionStorage (cleared when browser closes)
 * - Never stored permanently for security
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
    const GIST_FILENAME = 'stock_manager_inventory.json';
    const SESSION_TOKEN_KEY = 'github_token';
    const SESSION_GIST_ID_KEY = 'gist_id';
    const GITHUB_API_BASE = 'https://api.github.com';
    
    // Cache for items (to reduce API calls)
    let itemsCache = null;
    let cacheTimestamp = null;
    const CACHE_DURATION = 30000; // 30 seconds
    
    /**
     * Get the stored GitHub token from sessionStorage
     * @returns {string|null}
     */
    function getToken() {
        return sessionStorage.getItem(SESSION_TOKEN_KEY);
    }
    
    /**
     * Set the GitHub token in sessionStorage
     * @param {string} token
     */
    function setToken(token) {
        sessionStorage.setItem(SESSION_TOKEN_KEY, token);
    }
    
    /**
     * Get the Gist ID from sessionStorage
     * @returns {string|null}
     */
    function getGistId() {
        return sessionStorage.getItem(SESSION_GIST_ID_KEY);
    }
    
    /**
     * Set the Gist ID in sessionStorage
     * @param {string} gistId
     */
    function setGistId(gistId) {
        sessionStorage.setItem(SESSION_GIST_ID_KEY, gistId);
    }
    
    /**
     * Check if user is authenticated
     * @returns {boolean}
     */
    function isAuthenticated() {
        return !!getToken() && !!getGistId();
    }
    
    /**
     * Clear authentication data (logout)
     */
    function logout() {
        sessionStorage.removeItem(SESSION_TOKEN_KEY);
        sessionStorage.removeItem(SESSION_GIST_ID_KEY);
        itemsCache = null;
        cacheTimestamp = null;
    }
    
    /**
     * Make an authenticated request to GitHub API
     * @param {string} endpoint
     * @param {object} options
     * @returns {Promise<Response>}
     */
    async function githubRequest(endpoint, options = {}) {
        const token = getToken();
        if (!token) {
            throw new Error('Not authenticated');
        }
        
        const response = await fetch(`${GITHUB_API_BASE}${endpoint}`, {
            ...options,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28',
                'Content-Type': 'application/json',
                ...options.headers
            }
        });
        
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || `GitHub API error: ${response.status}`);
        }
        
        return response;
    }
    
    /**
     * Create a new Gist for storing inventory data
     * @returns {Promise<string>} The Gist ID
     */
    async function createGist() {
        const response = await githubRequest('/gists', {
            method: 'POST',
            body: JSON.stringify({
                description: 'Stock Manager Inventory Data',
                public: false,
                files: {
                    [GIST_FILENAME]: {
                        content: JSON.stringify([], null, 2)
                    }
                }
            })
        });
        
        const data = await response.json();
        return data.id;
    }
    
    /**
     * Authenticate with GitHub and initialize/connect to Gist
     * @param {string} token - GitHub Personal Access Token
     * @param {string} [existingGistId] - Optional existing Gist ID
     * @returns {Promise<{success: boolean, gistId: string}>}
     */
    async function authenticate(token, existingGistId = null) {
        // Temporarily set token for API calls
        setToken(token);
        
        try {
            // Verify token by getting user info
            await githubRequest('/user');
            
            let gistId = existingGistId;
            
            if (gistId) {
                // Verify the Gist exists and we have access
                try {
                    const response = await githubRequest(`/gists/${gistId}`);
                    const data = await response.json();
                    
                    // Check if our file exists in the Gist
                    if (!data.files[GIST_FILENAME]) {
                        // Add our file to the existing Gist
                        await githubRequest(`/gists/${gistId}`, {
                            method: 'PATCH',
                            body: JSON.stringify({
                                files: {
                                    [GIST_FILENAME]: {
                                        content: JSON.stringify([], null, 2)
                                    }
                                }
                            })
                        });
                    }
                } catch (error) {
                    throw new Error('Could not access the specified Gist. Please check the ID.');
                }
            } else {
                // Create new Gist
                gistId = await createGist();
            }
            
            setGistId(gistId);
            
            return { success: true, gistId };
        } catch (error) {
            // Clear token on failure
            logout();
            throw error;
        }
    }
    
    /**
     * Get all items from Gist
     * @param {boolean} [forceRefresh=false] - Skip cache
     * @returns {Promise<Array>} Array of inventory items
     */
    async function getAllItems(forceRefresh = false) {
        // Check cache first
        if (!forceRefresh && itemsCache && cacheTimestamp && 
            (Date.now() - cacheTimestamp) < CACHE_DURATION) {
            return [...itemsCache];
        }
        
        try {
            const gistId = getGistId();
            if (!gistId) {
                throw new Error('Not authenticated');
            }
            
            const response = await githubRequest(`/gists/${gistId}`);
            const data = await response.json();
            
            const fileContent = data.files[GIST_FILENAME]?.content;
            const items = fileContent ? JSON.parse(fileContent) : [];
            
            // Update cache
            itemsCache = items;
            cacheTimestamp = Date.now();
            
            return [...items];
        } catch (error) {
            console.error('Error reading from Gist:', error);
            // Return cached data if available on error
            if (itemsCache) {
                return [...itemsCache];
            }
            throw error;
        }
    }
    
    /**
     * Save all items to Gist
     * @param {Array} items - Array of items to save
     * @returns {Promise<void>}
     */
    async function saveAllItems(items) {
        const gistId = getGistId();
        if (!gistId) {
            throw new Error('Not authenticated');
        }
        
        await githubRequest(`/gists/${gistId}`, {
            method: 'PATCH',
            body: JSON.stringify({
                files: {
                    [GIST_FILENAME]: {
                        content: JSON.stringify(items, null, 2)
                    }
                }
            })
        });
        
        // Update cache
        itemsCache = [...items];
        cacheTimestamp = Date.now();
    }
    
    /**
     * Get a single item by its ID
     * @param {string} id - Item ID
     * @returns {Promise<Object|null>} Item or null if not found
     */
    async function getItemById(id) {
        const items = await getAllItems();
        return items.find(item => item.id === id) || null;
    }
    
    /**
     * Get a single item by its barcode
     * @param {string} barcode - Barcode to search for
     * @returns {Promise<Object|null>} Item or null if not found
     */
    async function getItemByBarcode(barcode) {
        const items = await getAllItems();
        return items.find(item => item.barcode === barcode) || null;
    }
    
    /**
     * Search items by description, stock number, or supplier
     * @param {string} query - Search query
     * @returns {Promise<Array>} Matching items
     */
    async function searchItems(query) {
        const items = await getAllItems();
        
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
    }
    
    /**
     * Add a new item to inventory
     * @param {Object} itemData - Item data (without id, createdAt, updatedAt)
     * @returns {Promise<Object>} The created item with generated fields
     */
    async function addItem(itemData) {
        const items = await getAllItems(true); // Force refresh before add
        
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
        await saveAllItems(items);
        
        return newItem;
    }
    
    /**
     * Update an existing item
     * @param {Object} itemData - Item data including id
     * @returns {Promise<Object|null>} Updated item or null if not found
     */
    async function updateItem(itemData) {
        const items = await getAllItems(true); // Force refresh before update
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
        
        await saveAllItems(items);
        return items[index];
    }
    
    /**
     * Remove/deduct stock from an item
     * @param {string} id - Item ID
     * @param {number} quantity - Quantity to remove
     * @returns {Promise<Object>} Result with success status and updated item
     */
    async function removeStock(id, quantity) {
        const items = await getAllItems(true); // Force refresh before remove
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
        
        await saveAllItems(items);
        
        return {
            success: true,
            item: items[index],
            removed: removeQty
        };
    }
    
    /**
     * Delete an item from inventory
     * @param {string} id - Item ID
     * @returns {Promise<boolean>} True if deleted, false if not found
     */
    async function deleteItem(id) {
        const items = await getAllItems(true); // Force refresh before delete
        const filteredItems = items.filter(item => item.id !== id);
        
        if (filteredItems.length === items.length) {
            return false; // Item not found
        }
        
        await saveAllItems(filteredItems);
        return true;
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
    async function getStats() {
        const items = await getAllItems();
        return {
            totalItems: items.length,
            totalStock: items.reduce((sum, item) => sum + item.quantity, 0),
            totalValue: items.reduce((sum, item) => sum + (item.costPrice * item.quantity), 0),
            lowStockItems: items.filter(item => item.quantity > 0 && item.quantity <= 5).length,
            outOfStockItems: items.filter(item => item.quantity === 0).length
        };
    }
    
    /**
     * Clear all inventory data (use with caution!)
     * @returns {Promise<void>}
     */
    async function clearAll() {
        await saveAllItems([]);
    }
    
    /**
     * Export all data as JSON string
     * @returns {Promise<string>} JSON string of all items
     */
    async function exportData() {
        const items = await getAllItems();
        return JSON.stringify(items, null, 2);
    }
    
    /**
     * Import data from JSON string
     * @param {string} jsonString - JSON string of items
     * @returns {Promise<number>} Number of items imported
     */
    async function importData(jsonString) {
        try {
            const items = JSON.parse(jsonString);
            if (!Array.isArray(items)) {
                throw new Error('Invalid data format');
            }
            await saveAllItems(items);
            return items.length;
        } catch (error) {
            throw error;
        }
    }
    
    // Public API
    return {
        // Authentication
        authenticate,
        isAuthenticated,
        logout,
        getGistId,
        
        // CRUD operations
        getAllItems,
        getItemById,
        getItemByBarcode,
        searchItems,
        addItem,
        updateItem,
        removeStock,
        deleteItem,
        
        // Utility
        getStats,
        clearAll,
        exportData,
        importData
    };
})();

// Make Storage available globally
window.Storage = Storage;
