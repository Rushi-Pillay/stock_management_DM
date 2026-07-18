import { useMemo, useState } from 'react';
import { useInventory } from '../contexts/InventoryContext';
import { useModal } from '../contexts/ModalContext';
import ItemCard from './ItemCard';
import { Search, X } from 'lucide-react';

const PAGE_SIZE = 20;

export default function InventoryView() {
    const { items, loading } = useInventory();
    const { openDetailModal, openItemModal } = useModal();
    const [query, setQuery] = useState('');
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

    const sortedItems = useMemo(
        () => [...items].sort((a, b) => a.description.localeCompare(b.description)),
        [items]
    );

    const trimmedQuery = query.trim();

    // Searching always checks the full inventory, not just whatever page is
    // currently visible, so results don't miss items outside the top 20.
    const filteredItems = useMemo(() => {
        if (!trimmedQuery) return null;

        const searchTerm = trimmedQuery.toLowerCase();
        return sortedItems.filter(item =>
            item.description.toLowerCase().includes(searchTerm) ||
            item.stockNumber.toLowerCase().includes(searchTerm) ||
            item.supplier.toLowerCase().includes(searchTerm) ||
            (item.barcode && item.barcode.toLowerCase().includes(searchTerm))
        );
    }, [sortedItems, trimmedQuery]);

    if (loading && items.length === 0) {
        return <div className="loading-state">Loading inventory...</div>;
    }

    const isSearching = filteredItems !== null;
    const displayedItems = isSearching ? filteredItems : sortedItems.slice(0, visibleCount);
    const remaining = isSearching ? 0 : sortedItems.length - displayedItems.length;

    return (
        <section className="view active">
            <div className="inventory-header">
                <h2>Full Inventory</h2>
            </div>

            <div className="search-container">
                <div className="search-input-wrapper">
                    <span className="search-icon"><Search size={20} /></span>
                    <input
                        type="text"
                        id="search-input"
                        placeholder="Search by name, stock number, supplier, or barcode..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    {query && (
                        <button className="clear-btn" onClick={() => setQuery('')}>
                            <X size={16} />
                        </button>
                    )}
                </div>
            </div>

            <div className="inventory-list">
                {sortedItems.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">📦</div>
                        <p className="empty-state-text">No items in inventory yet</p>
                    </div>
                ) : isSearching && displayedItems.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">🔍</div>
                        <p className="empty-state-text">No items found for "{query}"</p>
                        <button className="btn btn-accent add-new-from-empty" onClick={() => openItemModal(null)}>
                            ➕ Add New Item
                        </button>
                    </div>
                ) : (
                    displayedItems.map(item => (
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
