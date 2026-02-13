import { useState, useEffect } from 'react';
import { useInventory } from '../contexts/InventoryContext';
import { useModal } from '../contexts/ModalContext';
import ItemCard from './ItemCard';
import { Search, X } from 'lucide-react';

export default function SearchView() {
    const { items } = useInventory();
    const { openDetailModal, openItemModal } = useModal();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);

    useEffect(() => {
        if (!query.trim()) {
            setResults([]);
            return;
        }

        const searchTerm = query.toLowerCase().trim();
        const filtered = items.filter(item =>
            item.description.toLowerCase().includes(searchTerm) ||
            item.stockNumber.toLowerCase().includes(searchTerm) ||
            item.supplier.toLowerCase().includes(searchTerm) ||
            (item.barcode && item.barcode.toLowerCase().includes(searchTerm))
        );

        setResults(filtered);
    }, [query, items]);

    return (
        <section className="view active">
            <div className="search-container">
                <div className="search-input-wrapper">
                    <span className="search-icon"><Search size={20} /></span>
                    <input
                        type="text"
                        placeholder="Search by name, stock number, or supplier..."
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

            <div className="results-container">
                {!query ? (
                    <p className="placeholder-text">Start typing to search inventory...</p>
                ) : results.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">🔍</div>
                        <p className="empty-state-text">No items found for "{query}"</p>
                        <button className="btn btn-accent add-new-from-empty" onClick={() => openItemModal(null)}>
                            ➕ Add New Item
                        </button>
                    </div>
                ) : (
                    results.map(item => (
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
