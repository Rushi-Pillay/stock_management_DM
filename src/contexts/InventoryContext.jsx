import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { githubRequest } from '../utils/github';

const InventoryContext = createContext(null);
const GIST_FILENAME = 'stock_manager_inventory.json';

// Helper to generate IDs
const generateId = () => 'item_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);

export function InventoryProvider({ children }) {
    const { token, gistId, isAuthenticated } = useAuth();
    const { showToast } = useToast();

    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);

    // Load items from Gist
    const loadInventory = useCallback(async (silent = false) => {
        if (!isAuthenticated) return;

        if (!silent) setLoading(true);

        try {
            const response = await githubRequest(`/gists/${gistId}`, token);
            const data = await response.json();
            const fileContent = data.files[GIST_FILENAME]?.content;
            const parsedItems = fileContent ? JSON.parse(fileContent) : [];

            setItems(parsedItems);
        } catch (err) {
            console.error('Error loading inventory:', err);
            showToast('Failed to load inventory', 'error');
        } finally {
            if (!silent) setLoading(false);
        }
    }, [token, gistId, isAuthenticated, showToast]);

    // Save items to Gist
    const saveInventory = async (newItems) => {
        if (!isAuthenticated) return;

        try {
            await githubRequest(`/gists/${gistId}`, token, {
                method: 'PATCH',
                body: JSON.stringify({
                    files: {
                        [GIST_FILENAME]: {
                            content: JSON.stringify(newItems, null, 2)
                        }
                    }
                })
            });
            setItems(newItems);
            return true;
        } catch (err) {
            console.error('Error saving inventory:', err);
            showToast('Failed to save changes', 'error');
            return false;
        }
    };

    // CRUD Operations
    const addItem = async (itemData) => {
        const newItem = {
            id: generateId(),
            ...itemData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const newItems = [...items, newItem];
        const success = await saveInventory(newItems);
        if (success) showToast('Item added successfully', 'success');
        return success;
    };

    const updateItem = async (itemData) => {
        const newItems = items.map(item =>
            item.id === itemData.id
                ? { ...item, ...itemData, updatedAt: new Date().toISOString() }
                : item
        );

        const success = await saveInventory(newItems);
        if (success) showToast('Item updated successfully', 'success');
        return success;
    };

    const deleteItem = async (id) => {
        const newItems = items.filter(item => item.id !== id);
        const success = await saveInventory(newItems);
        if (success) showToast('Item deleted successfully', 'success');
        return success;
    };

    const removeStock = async (id, quantity) => {
        const item = items.find(i => i.id === id);
        if (!item) return false;

        if (item.quantity < quantity) {
            showToast(`Not enough stock. Available: ${item.quantity}`, 'error');
            return false;
        }

        const newItems = items.map(i =>
            i.id === id
                ? { ...i, quantity: i.quantity - quantity, updatedAt: new Date().toISOString() }
                : i
        );

        const success = await saveInventory(newItems);
        if (success) showToast(`Stock removed. New quantity: ${item.quantity - quantity}`, 'success');
        return success;
    };

    // Initial load
    useEffect(() => {
        if (isAuthenticated) {
            loadInventory();
        } else {
            setItems([]);
        }
    }, [isAuthenticated, loadInventory]);

    return (
        <InventoryContext.Provider value={{
            items,
            loading,
            loadInventory,
            addItem,
            updateItem,
            deleteItem,
            removeStock
        }}>
            {children}
        </InventoryContext.Provider>
    );
}

export function useInventory() {
    const context = useContext(InventoryContext);
    if (!context) {
        throw new Error('useInventory must be used within an InventoryProvider');
    }
    return context;
}
