import { useInventory } from '../contexts/InventoryContext';
import { useModal } from '../contexts/ModalContext';
import ItemCard from './ItemCard';
import { Package } from 'lucide-react';

export default function InventoryView() {
    const { items, loading } = useInventory();
    const { openDetailModal, openItemModal } = useModal();

    if (loading && items.length === 0) {
        return <div className="loading-state">Loading inventory...</div>;
    }

    // Sort by description
    const sortedItems = [...items].sort((a, b) =>
        a.description.localeCompare(b.description)
    );

    return (
        <section className="view active">
            <div className="inventory-header">
                <h2>Full Inventory</h2>
                <button className="btn btn-accent" onClick={() => openItemModal(null)}>
                    <span className="btn-icon">➕</span>
                    Add Item
                </button>
            </div>

            <div className="inventory-list">
                {sortedItems.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">📦</div>
                        <p className="empty-state-text">No items in inventory yet</p>
                        <button className="btn btn-accent add-new-from-empty" onClick={() => openItemModal(null)}>
                            ➕ Add New Item
                        </button>
                    </div>
                ) : (
                    sortedItems.map(item => (
                        <ItemCard
                            key={item.id}
                            item={item}
                            onClick={openDetailModal}
                        />
                    ))
                )}
            </div>
        </section>
    );
}
