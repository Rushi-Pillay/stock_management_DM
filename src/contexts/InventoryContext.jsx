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
    const { isAuthenticated, user, userData } = useAuth();
    const { showToast } = useToast();

    const [items, setItems] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(false);

    // Load items from Firestore
    const loadInventory = useCallback(async (silent = false) => {
        if (!isAuthenticated) return;

        if (!silent) setLoading(true);

        try {
            // const q = query(collection(db, 'inventory'), orderBy('name'));
            const q = query(collection(db, 'inventory'));

            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                console.log("Snapshot is empty. Check collection.");
            }

            const loadedItems = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            console.log('Inventory loaded successfully', loadedItems.length, 'items');
            setItems(loadedItems);
        } catch (err) {
            console.error('Error loading inventory:', err);
            showToast('Failed to load inventory', 'error');
        } finally {
            if (!silent) setLoading(false);
        }
    }, [isAuthenticated, showToast]);

    // Load transactions
    const loadTransactions = useCallback(async () => {
        if (!isAuthenticated) return;
        try {
            const q = query(collection(db, 'transactions'), orderBy('timestamp', 'desc'));
            const snapshot = await getDocs(q);
            const loadedTransactions = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setTransactions(loadedTransactions);
        } catch (err) {
            console.error("Error loading transactions:", err);
            // Don't show toast to avoid spamming if it fails silently
        }
    }, [isAuthenticated]);

    // CRUD Operations
    const addItem = async (itemData) => {
        try {
            const newItem = {
                ...itemData,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            const docRef = await addDoc(collection(db, 'inventory'), newItem);

            // Log Transaction
            await addDoc(collection(db, 'transactions'), {
                type: 'IN', // 'IN' for buying/initial stock
                itemId: docRef.id,
                itemName: newItem.description,
                quantity: Number(newItem.quantity),
                costPrice: Number(newItem.costPrice),
                totalCost: Number(newItem.quantity) * Number(newItem.costPrice),
                timestamp: new Date().toISOString(),
                reason: 'Initial Stock',
                performedBy: userData?.name || user?.email || 'Unknown'
            });

            // Optimistic update or reload
            const addedItem = { id: docRef.id, ...newItem };
            setItems(prev => [...prev, addedItem]);
            loadTransactions(); // Refresh transactions

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

            const oldItem = items.find(i => i.id === id);

            await updateDoc(itemRef, updateData);

            // Log transaction if quantity changed or cost price changed significantly
            // We mainly care about stock changes here
            if (oldItem) {
                const oldQty = Number(oldItem.quantity);
                const newQty = Number(updateData.quantity);
                const diff = newQty - oldQty;

                if (diff !== 0) {
                    await addDoc(collection(db, 'transactions'), {
                        type: diff > 0 ? 'IN' : 'ADJUSTMENT',
                        itemId: id,
                        itemName: updateData.description,
                        quantity: diff, // Log signed difference
                        costPrice: Number(updateData.costPrice), // Use the NEW cost price
                        totalCost: diff * Number(updateData.costPrice), // Log signed total cost
                        timestamp: new Date().toISOString(),
                        reason: diff > 0 ? 'Stock Update (Add)' : 'Stock Update (Adjustment)',
                        performedBy: userData?.name || user?.email || 'Unknown'
                    });
                    loadTransactions();
                }
            }

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
        const itemToDelete = items.find(i => i.id === id);

        try {
            await deleteDoc(doc(db, 'inventory', id));

            if (itemToDelete) {
                await addDoc(collection(db, 'transactions'), {
                    type: 'DELETE',
                    itemId: id,
                    itemName: itemToDelete.description,
                    quantity: -Number(itemToDelete.quantity), // Negative for deletion
                    costPrice: Number(itemToDelete.costPrice),
                    salePrice: 0,
                    totalCost: -Number(itemToDelete.quantity) * Number(itemToDelete.costPrice), // Negative value leaving
                    totalSales: 0,
                    timestamp: new Date().toISOString(),
                    reason: 'Item Deleted',
                    performedBy: userData?.name || user?.email || 'Unknown'
                });
                loadTransactions();
            }

            setItems(prev => prev.filter(item => item.id !== id));

            showToast('Item deleted successfully', 'success');
            return true;
        } catch (err) {
            console.error('Error deleting item:', err);
            showToast('Failed to delete item', 'error');
            return false;
        }
    };

    const removeStock = async (id, quantity, salePrice) => {
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

            // Log Transaction
            await addDoc(collection(db, 'transactions'), {
                type: 'OUT',
                itemId: id,
                itemName: item.description,
                quantity: -quantity, // Negative for sale
                costPrice: Number(item.costPrice), // Cost at time of sale
                salePrice: Number(salePrice), // Sale Price at time of sale
                totalCost: -quantity * Number(item.costPrice), // Negative value leaving
                totalSales: quantity * Number(salePrice), // Positive revenue
                timestamp: new Date().toISOString(),
                reason: 'Sale / Removal',
                performedBy: userData?.name || user?.email || 'Unknown'
            });

            setItems(prev => prev.map(i =>
                i.id === id ? { ...i, quantity: newQuantity } : i
            ));
            loadTransactions();

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
            loadTransactions();
        } else {
            setItems([]);
            setTransactions([]);
        }
    }, [isAuthenticated, loadInventory, loadTransactions]);

    return (
        <InventoryContext.Provider value={{
            items,
            loading,
            loadInventory,
            addItem,
            updateItem,
            deleteItem,
            removeStock,
            transactions,
            loadTransactions
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
