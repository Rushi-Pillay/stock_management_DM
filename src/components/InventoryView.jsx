import { useState } from 'react';
import { useInventory } from '../contexts/InventoryContext';
import { useModal } from '../contexts/ModalContext';
import ItemCard from './ItemCard';
import { Package } from 'lucide-react';

const PAGE_SIZE = 20;

export default function InventoryView() {
    const { items, loading } = useInventory();
    const { openDetailModal, openItemModal } = useModal();
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

    if (loading && items.length === 0) {
        return <div className="loading-state">Loading inventory...</div>;
    }

    // Sort by description
    const sortedItems = [...items].sort((a, b) =>
        a.description.localeCompare(b.description)
    );

    const visibleItems = sortedItems.slice(0, visibleCount);
    const remaining = sortedItems.length - visibleItems.length;

    return (
        <section className="view active">
            <div className="inventory-header">
                <h2>Full Inventory</h2>
                {/* Add Item button removed as per request */}
            </div>

            <div className="inventory-list">
                {sortedItems.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">📦</div>
                        <p className="empty-state-text">No items in inventory yet</p>
                    </div>
                ) : (
                    visibleItems.map(item => (
                        <ItemCard
                            key={item.id}
                            item={item}
                            onClick={openDetailModal}
                        />
                    ))
                )}
            </div>

            {remaining > 0 && (
                <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                    <button
                        className="btn btn-secondary"
                        onClick={() => setVisibleCount(prev => prev + PAGE_SIZE)}
                    >
                        Load More ({remaining} remaining)
                    </button>
                </div>
            )}
        </section>
    );
}
