import { createContext, useContext, useState, useCallback } from 'react';
import ItemModal from '../components/ItemModal';
import ItemDetailModal from '../components/ItemDetailModal';
import SellModal from '../components/SellModal';
import { useInventory } from './InventoryContext';

const ModalContext = createContext(null);

export function ModalProvider({ children }) {
    const { addItem, updateItem, removeStock, deleteItem } = useInventory();

    const [activeModal, setActiveModal] = useState(null); // 'item', 'detail', 'sell'
    const [modalProps, setModalProps] = useState({});

    const closeModals = useCallback(() => {
        setActiveModal(null);
        setModalProps({});
    }, []);

    const openItemModal = useCallback((item = null) => {
        setModalProps({
            initialData: item,
            onSave: async (data) => {
                if (data.id) {
                    await updateItem(data);
                } else {
                    await addItem(data);
                }
            },
            onDelete: async (id) => {
                if (window.confirm(`Are you sure you want to delete this item? This action cannot be undone.`)) {
                    await deleteItem(id);
                    closeModals();
                }
            }
        });
        setActiveModal('item');
    }, [addItem, updateItem]);

    const openSellModal = useCallback((item) => {
        setModalProps({
            item,
            onConfirm: async (id, quantity, salePrice) => {
                await removeStock(id, quantity, salePrice);
            }
        });
        setActiveModal('sell');
    }, [removeStock]);

    const openDetailModal = useCallback((item) => {
        setModalProps({
            item,
            onEdit: (itemToEdit) => {
                closeModals();
                setTimeout(() => openItemModal(itemToEdit), 0);
            },
            onSell: (itemToSell) => {
                closeModals();
                setTimeout(() => openSellModal(itemToSell), 0);
            }
        });
        setActiveModal('detail');
    }, [closeModals, openItemModal, openSellModal]);

    return (
        <ModalContext.Provider value={{ openItemModal, openDetailModal, openSellModal, closeModals }}>
            {children}

            {activeModal === 'item' && (
                <ItemModal
                    isOpen={true}
                    onClose={closeModals}
                    {...modalProps}
                />
            )}

            {activeModal === 'detail' && (
                <ItemDetailModal
                    isOpen={true}
                    onClose={closeModals}
                    {...modalProps}
                />
            )}

            {activeModal === 'sell' && (
                <SellModal
                    isOpen={true}
                    onClose={closeModals}
                    {...modalProps}
                />
            )}
        </ModalContext.Provider>
    );
}

export function useModal() {
    const context = useContext(ModalContext);
    if (!context) {
        throw new Error('useModal must be used within a ModalProvider');
    }
    return context;
}
