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
    orderBy,
    limit,
    runTransaction
} from 'firebase/firestore';

const InventoryContext = createContext(null);

export function InventoryProvider({ children }) {
    const { isAuthenticated, user, userData } = useAuth();
    const { showToast } = useToast();

    const [items, setItems] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(false);

    // Load transactions from Firestore
    const loadTransactions = useCallback(async () => {
        if (!isAuthenticated) return;

        try {
            const q = query(
                collection(db, 'transactions'),
                orderBy('timestamp', 'desc'),
                limit(50)
            );
            const querySnapshot = await getDocs(q);
            const loadedTransactions = querySnapshot.docs.map(d => ({
                id: d.id,
                ...d.data()
            }));
            setTransactions(loadedTransactions);
        } catch (err) {
            console.error('Error loading transactions:', err);
        }
    }, [isAuthenticated]);

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

    // CRUD Operations
    const addItem = async (itemData) => {
        try {
            const newItem = {
                ...itemData,
                // Form inputs hand these back as strings even for type="number";
                // store them as real numbers so downstream math (e.g. new stock
                // level previews) adds instead of concatenating.
                quantity: Number(itemData.quantity) || 0,
                costPrice: Number(itemData.costPrice) || 0,
                sellingPrice: Number(itemData.sellingPrice) || 0,
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
                // Same string-vs-number fix as addItem - form inputs are strings.
                quantity: Number(data.quantity) || 0,
                costPrice: Number(data.costPrice) || 0,
                sellingPrice: Number(data.sellingPrice) || 0,
                updatedAt: new Date().toISOString()
            };

            const oldItem = items.find(i => i.id === id);

            await updateDoc(itemRef, updateData);

            // Log transaction if quantity changed
            if (oldItem) {
                const oldQty = Number(oldItem.quantity);
                const newQty = Number(updateData.quantity);
                const diff = newQty - oldQty;

                if (diff !== 0) {
                    await addDoc(collection(db, 'transactions'), {
                        type: diff > 0 ? 'IN' : 'ADJUSTMENT',
                        itemId: id,
                        itemName: updateData.description,
                        quantity: diff,
                        costPrice: Number(updateData.costPrice),
                        totalCost: diff * Number(updateData.costPrice),
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
                    quantity: -Number(itemToDelete.quantity),
                    costPrice: Number(itemToDelete.costPrice),
                    salePrice: 0,
                    totalCost: -Number(itemToDelete.quantity) * Number(itemToDelete.costPrice),
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

    // Atomic multi-item checkout for the POS screen.
    // cartItems: Array<{ id: string, itemName: string, quantity: number, unitPrice: number, costPrice: number }>
    // Returns Promise<boolean> - true on success, false on failure (already shows a toast either way)
    const checkoutSale = async (cartItems) => {
        const saleId = crypto.randomUUID();

        try {
            await runTransaction(db, async (transaction) => {
                const refs = cartItems.map(ci => doc(db, 'inventory', ci.id));

                // All reads must happen before any writes in a Firestore transaction.
                const snapshots = await Promise.all(refs.map(ref => transaction.get(ref)));

                const currentQuantities = snapshots.map((snap, idx) => {
                    const ci = cartItems[idx];
                    if (!snap.exists()) {
                        throw new Error(`Item not found: ${ci.itemName}`);
                    }
                    const currentQty = Number(snap.data().quantity);
                    if (currentQty < ci.quantity) {
                        throw new Error(`Not enough stock for ${ci.itemName}. Available: ${currentQty}`);
                    }
                    return currentQty;
                });

                cartItems.forEach((ci, idx) => {
                    const currentQty = currentQuantities[idx];
                    const itemRef = refs[idx];

                    transaction.update(itemRef, {
                        quantity: currentQty - ci.quantity,
                        updatedAt: new Date().toISOString()
                    });

                    const txnRef = doc(collection(db, 'transactions'));
                    transaction.set(txnRef, {
                        type: 'OUT',
                        itemId: ci.id,
                        itemName: ci.itemName,
                        quantity: -ci.quantity,
                        costPrice: Number(ci.costPrice),
                        salePrice: Number(ci.unitPrice),
                        totalCost: -ci.quantity * Number(ci.costPrice),
                        totalSales: ci.quantity * Number(ci.unitPrice),
                        timestamp: new Date().toISOString(),
                        reason: 'POS Sale',
                        performedBy: userData?.name || user?.email || 'Unknown',
                        saleId
                    });
                });
            });

            // Optimistic local update
            setItems(prev => prev.map(item => {
                const ci = cartItems.find(c => c.id === item.id);
                return ci ? { ...item, quantity: Number(item.quantity) - ci.quantity } : item;
            }));
            loadTransactions();

            showToast('Sale completed successfully', 'success');
            return true;
        } catch (err) {
            console.error('Error checking out sale:', err);
            showToast(err.message || 'Sale failed', 'error');
            return false;
        }
    };

    // Atomic multi-item stock intake for the Stock Intake screen.
    // cartItems: Array<{ id: string, itemName: string, quantity: number, costPrice: number }>
    // Returns Promise<boolean> - true on success, false on failure (already shows a toast either way)
    const receiveStock = async (cartItems) => {
        try {
            await runTransaction(db, async (transaction) => {
                const refs = cartItems.map(ci => doc(db, 'inventory', ci.id));

                // All reads must happen before any writes in a Firestore transaction.
                const snapshots = await Promise.all(refs.map(ref => transaction.get(ref)));

                snapshots.forEach((snap, idx) => {
                    if (!snap.exists()) {
                        throw new Error(`Item not found: ${cartItems[idx].itemName}`);
                    }
                });

                cartItems.forEach((ci, idx) => {
                    const currentQty = Number(snapshots[idx].data().quantity) || 0;
                    const itemRef = refs[idx];

                    transaction.update(itemRef, {
                        quantity: currentQty + ci.quantity,
                        costPrice: Number(ci.costPrice),
                        updatedAt: new Date().toISOString()
                    });

                    const txnRef = doc(collection(db, 'transactions'));
                    transaction.set(txnRef, {
                        type: 'IN',
                        itemId: ci.id,
                        itemName: ci.itemName,
                        quantity: ci.quantity,
                        costPrice: Number(ci.costPrice),
                        totalCost: ci.quantity * Number(ci.costPrice),
                        timestamp: new Date().toISOString(),
                        reason: 'Stock Intake',
                        performedBy: userData?.name || user?.email || 'Unknown'
                    });
                });
            });

            // Optimistic local update
            setItems(prev => prev.map(item => {
                const ci = cartItems.find(c => c.id === item.id);
                return ci ? { ...item, quantity: Number(item.quantity) + ci.quantity, costPrice: Number(ci.costPrice) } : item;
            }));
            loadTransactions();

            showToast('Stock received successfully', 'success');
            return true;
        } catch (err) {
            console.error('Error receiving stock:', err);
            showToast(err.message || 'Stock intake failed', 'error');
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

        return checkoutSale([{
            id,
            itemName: item.description,
            quantity,
            unitPrice: salePrice,
            costPrice: item.costPrice
        }]);
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
            checkoutSale,
            receiveStock,
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
