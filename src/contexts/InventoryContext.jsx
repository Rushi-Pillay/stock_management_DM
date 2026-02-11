import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { db } from '../utils/firebase';
import {
    collection,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    query,
    orderBy
} from 'firebase/firestore';

const InventoryContext = createContext(null);

export function InventoryProvider({ children }) {
    const { isAuthenticated } = useAuth();
    const { showToast } = useToast();

    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);

    // Load items from Firestore
    const loadInventory = useCallback(async (silent = false) => {
        if (!isAuthenticated) return;

        if (!silent) setLoading(true);

        try {
            const q = query(collection(db, 'inventory'), orderBy('name'));
            const querySnapshot = await getDocs(q);
            const loadedItems = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            setItems(loadedItems);
        } catch (err) {
            console.error('Error loading inventory:', err);
            showToast('Failed to load inventory', 'error');
        } finally {
            if (!silent) setLoading(false);
        }
    }, [isAuthenticated, showToast]);

    // CRUD Operations
    const addItem = async (itemData) => {
        try {
            const newItem = {
                ...itemData,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            const docRef = await addDoc(collection(db, 'inventory'), newItem);

            // Optimistic update or reload
            const addedItem = { id: docRef.id, ...newItem };
            setItems(prev => [...prev, addedItem]);

            showToast('Item added successfully', 'success');
            return true;
        } catch (err) {
            console.error('Error adding item:', err);
            showToast('Failed to add item', 'error');
            return false;
        }
    };

    const updateItem = async (itemData) => {
        try {
            const { id, ...data } = itemData;
            const itemRef = doc(db, 'inventory', id);

            const updateData = {
                ...data,
                updatedAt: new Date().toISOString()
            };

            await updateDoc(itemRef, updateData);

            setItems(prev => prev.map(item =>
                item.id === id ? { ...item, ...updateData } : item
            ));

            showToast('Item updated successfully', 'success');
            return true;
        } catch (err) {
            console.error('Error updating item:', err);
            showToast('Failed to update item', 'error');
            return false;
        }
    };

    const deleteItem = async (id) => {
        try {
            await deleteDoc(doc(db, 'inventory', id));

            setItems(prev => prev.filter(item => item.id !== id));

            showToast('Item deleted successfully', 'success');
            return true;
        } catch (err) {
            console.error('Error deleting item:', err);
            showToast('Failed to delete item', 'error');
            return false;
        }
    };

    const removeStock = async (id, quantity) => {
        const item = items.find(i => i.id === id);
        if (!item) return false;

        if (item.quantity < quantity) {
            showToast(`Not enough stock. Available: ${item.quantity}`, 'error');
            return false;
        }

        try {
            const itemRef = doc(db, 'inventory', id);
            const newQuantity = item.quantity - quantity;

            await updateDoc(itemRef, {
                quantity: newQuantity,
                updatedAt: new Date().toISOString()
            });

            setItems(prev => prev.map(i =>
                i.id === id ? { ...i, quantity: newQuantity } : i
            ));

            showToast(`Stock removed. New quantity: ${newQuantity}`, 'success');
            return true;
        } catch (err) {
            console.error('Error removing stock:', err);
            showToast('Failed to update stock', 'error');
            return false;
        }
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
