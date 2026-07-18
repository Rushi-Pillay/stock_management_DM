import { useEffect, useRef, useState } from 'react';
import { useInventory } from '../contexts/InventoryContext';
import { useToast } from '../contexts/ToastContext';
import { formatCurrency } from '../utils/format';
import { Plus, Trash2, ShoppingCart } from 'lucide-react';
import ItemCard from './ItemCard';

// Persist the in-progress cart across view switches (and page reloads) so
// leaving the POS screen mid-sale doesn't lose the cashier's work.
const CART_STORAGE_KEY = 'pos_cart_state';

function loadPersistedCart() {
    try {
        const raw = localStorage.getItem(CART_STORAGE_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

export default function POSView({ isDesktop }) {
    const { items, checkoutSale } = useInventory();
    const { showToast } = useToast();

    const [code, setCode] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [cart, setCart] = useState(() => loadPersistedCart()?.cart || []);
    const [discount, setDiscount] = useState(() => loadPersistedCart()?.discount || 0);
    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const inputRef = useRef(null);

    useEffect(() => {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({ cart, discount }));
    }, [cart, discount]);

    // Auto-focus the scan input on desktop (a physical scanner types + Enters here).
    // Skip on mobile so we don't pop the on-screen keyboard unexpectedly.
    useEffect(() => {
        if (isDesktop && inputRef.current) {
            const timer = setTimeout(() => {
                if (inputRef.current) inputRef.current.focus();
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [isDesktop]);

    const refocusInput = () => {
        setTimeout(() => {
            if (inputRef.current) inputRef.current.focus();
        }, 0);
    };

    const addToCart = (item) => {
        if (!item.quantity || item.quantity <= 0) {
            showToast(`${item.description} is out of stock`, 'warning');
            setSearchResults([]);
            setCode('');
            refocusInput();
            return;
        }

        const existing = cart.find(line => line.id === item.id);

        if (existing) {
            if (existing.quantity >= existing.maxQuantity) {
                showToast(`Only ${existing.maxQuantity} in stock for ${item.description}`, 'warning');
            } else {
                setCart(cart.map(line =>
                    line.id === item.id ? { ...line, quantity: line.quantity + 1 } : line
                ));
                showToast(`Added ${item.description} to cart`, 'success');
            }
        } else {
            setCart([...cart, {
                id: item.id,
                description: item.description,
                stockNumber: item.stockNumber,
                quantity: 1,
                unitPrice: Number(item.sellingPrice) || 0,
                sellingPrice: Number(item.sellingPrice) || 0,
                costPrice: Number(item.costPrice) || 0,
                maxQuantity: item.quantity
            }]);
            showToast(`Added ${item.description} to cart`, 'success');
        }

        setSearchResults([]);
        setCode('');
        refocusInput();
    };

    const handleLookup = () => {
        const trimmed = code.trim();
        if (!trimmed) return;

        // 1. Exact barcode match
        const exactMatch = items.find(item => item.barcode === trimmed);
        if (exactMatch) {
            addToCart(exactMatch);
            return;
        }

        // 2. Search match (description / stock number)
        const searchTerm = trimmed.toLowerCase();
        const searchMatches = items.filter(item =>
            item.description.toLowerCase().includes(searchTerm) ||
            item.stockNumber.toLowerCase().includes(searchTerm)
        );

        if (searchMatches.length === 1) {
            addToCart(searchMatches[0]);
        } else if (searchMatches.length > 1) {
            setSearchResults(searchMatches);
            showToast(`Found ${searchMatches.length} matches. Please select one.`, 'info');
        } else {
            setSearchResults([]);
            showToast('Item not found', 'warning');
            setCode('');
            refocusInput();
        }
    };

    const updateQuantity = (id, rawValue) => {
        const line = cart.find(l => l.id === id);
        if (!line) return;

        let qty = parseInt(rawValue, 10);
        if (isNaN(qty) || qty < 1) qty = 1;

        if (qty > line.maxQuantity) {
            qty = line.maxQuantity;
            showToast(`Only ${line.maxQuantity} in stock for ${line.description}`, 'warning');
        }

        setCart(cart.map(l => l.id === id ? { ...l, quantity: qty } : l));
    };

    const updateUnitPrice = (id, rawValue) => {
        let price = parseFloat(rawValue);
        if (isNaN(price) || price < 0) price = 0;

        setCart(cart.map(l => l.id === id ? { ...l, unitPrice: price } : l));
    };

    const removeLine = (id) => {
        setCart(cart.filter(l => l.id !== id));
    };

    const handleClearCart = () => {
        if (cart.length === 0 && discount === 0) return;
        if (window.confirm('Clear all items from the cart?')) {
            setCart([]);
            setDiscount(0);
        }
    };

    const updateDiscount = (rawValue) => {
        let val = parseFloat(rawValue);
        if (isNaN(val) || val < 0) val = 0;
        setDiscount(val);
    };

    const handleCheckout = async () => {
        if (cart.length === 0) {
            showToast('Cart is empty', 'warning');
            return;
        }

        setIsCheckingOut(true);
        try {
            // A discount is taken off the subtotal as a flat amount. To keep
            // each line's logged sale price meaningful for profit tracking,
            // scale every line down by the same ratio so the logged total
            // still matches what was actually charged.
            const scale = subtotal > 0 ? total / subtotal : 1;

            const cartItems = cart.map(line => ({
                id: line.id,
                itemName: line.description,
                quantity: line.quantity,
                unitPrice: Math.round(line.unitPrice * scale * 100) / 100,
                costPrice: line.costPrice
            }));

            const success = await checkoutSale(cartItems);
            if (success) {
                setCart([]);
                setDiscount(0);
            }
            // On failure, checkoutSale already shows its own error toast; leave cart untouched.
        } finally {
            setIsCheckingOut(false);
        }
    };

    const subtotal = cart.reduce((sum, line) => sum + (line.quantity * line.unitPrice), 0);
    const totalItems = cart.reduce((sum, line) => sum + line.quantity, 0);
    const total = Math.max(0, subtotal - (Number(discount) || 0));

    return (
        <section className="view active pos-view">
            <div className="view-header" style={{ marginBottom: '1.5rem' }}>
                <h2>Point of Sale</h2>
            </div>

            <div className="pos-scan-row">
                <input
                    ref={inputRef}
                    type="text"
                    className="pos-scan-input"
                    placeholder="Scan barcode or enter stock number / description"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            handleLookup();
                        }
                    }}
                />
                <button className="btn btn-primary" onClick={handleLookup}>
                    <Plus size={18} />
                    Add to Cart
                </button>
            </div>

            {searchResults.length > 0 && (
                <div className="pos-search-results">
                    <p className="pos-search-hint">Multiple matches found. Select an item to add:</p>
                    {searchResults.map(item => (
                        <ItemCard key={item.id} item={item} onClick={addToCart} />
                    ))}
                </div>
            )}

            <div className="pos-cart-section">
                {cart.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon"><ShoppingCart size={48} /></div>
                        <p className="empty-state-text">Cart is empty. Scan or search for an item to begin a sale.</p>
                    </div>
                ) : isDesktop ? (
                    <div className="table-responsive">
                        <table className="data-table pos-cart-table">
                            <thead>
                                <tr>
                                    <th>Item</th>
                                    <th>Stock #</th>
                                    <th>Qty</th>
                                    <th>Unit Price</th>
                                    <th>Total</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {cart.map(line => {
                                    const isCustomPrice = line.unitPrice !== line.sellingPrice;
                                    return (
                                        <tr key={line.id} className={isCustomPrice ? 'pos-row-custom' : ''}>
                                            <td>
                                                {line.description}
                                                {isCustomPrice && (
                                                    <span className="badge badge-warning pos-custom-badge">Custom price</span>
                                                )}
                                            </td>
                                            <td>{line.stockNumber}</td>
                                            <td>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max={line.maxQuantity}
                                                    value={line.quantity}
                                                    onChange={(e) => updateQuantity(line.id, e.target.value)}
                                                    className="pos-qty-input"
                                                />
                                            </td>
                                            <td>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={line.unitPrice}
                                                    onChange={(e) => updateUnitPrice(line.id, e.target.value)}
                                                    className="pos-price-input"
                                                />
                                            </td>
                                            <td className="pos-line-total">{formatCurrency(line.quantity * line.unitPrice)}</td>
                                            <td>
                                                <button
                                                    className="pos-remove-btn"
                                                    onClick={() => removeLine(line.id)}
                                                    title="Remove line"
                                                    aria-label="Remove line"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="pos-cart-cards">
                        {cart.map(line => {
                            const isCustomPrice = line.unitPrice !== line.sellingPrice;
                            return (
                                <div key={line.id} className={`pos-cart-card ${isCustomPrice ? 'pos-row-custom' : ''}`}>
                                    <div className="pos-cart-card-header">
                                        <div>
                                            <div className="pos-cart-card-title">{line.description}</div>
                                            <div className="pos-cart-card-sub">{line.stockNumber}</div>
                                        </div>
                                        <button
                                            className="pos-remove-btn"
                                            onClick={() => removeLine(line.id)}
                                            title="Remove line"
                                            aria-label="Remove line"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                    {isCustomPrice && (
                                        <span className="badge badge-warning pos-custom-badge">Custom price</span>
                                    )}
                                    <div className="pos-cart-card-row">
                                        <div className="pos-cart-card-field">
                                            <label>Qty</label>
                                            <input
                                                type="number"
                                                min="1"
                                                max={line.maxQuantity}
                                                value={line.quantity}
                                                onChange={(e) => updateQuantity(line.id, e.target.value)}
                                                className="pos-qty-input"
                                            />
                                        </div>
                                        <div className="pos-cart-card-field">
                                            <label>Unit Price</label>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={line.unitPrice}
                                                onChange={(e) => updateUnitPrice(line.id, e.target.value)}
                                                className="pos-price-input"
                                            />
                                        </div>
                                    </div>
                                    <div className="pos-cart-card-total">
                                        Total: <strong>{formatCurrency(line.quantity * line.unitPrice)}</strong>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="pos-footer">
                <div className="pos-footer-summary">
                    <div className="pos-summary-row">
                        <span>Lines</span>
                        <span>{cart.length}</span>
                    </div>
                    <div className="pos-summary-row">
                        <span>Items</span>
                        <span>{totalItems}</span>
                    </div>
                    <div className="pos-summary-row">
                        <span>Subtotal</span>
                        <span>{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="pos-summary-row pos-discount-row">
                        <label htmlFor="pos-discount">Discount</label>
                        <input
                            type="number"
                            id="pos-discount"
                            min="0"
                            step="0.01"
                            value={discount}
                            onChange={(e) => updateDiscount(e.target.value)}
                            className="pos-discount-input"
                        />
                    </div>
                    <div className="pos-summary-row pos-summary-total">
                        <span>Total</span>
                        <span>{formatCurrency(total)}</span>
                    </div>
                </div>
                <div className="pos-footer-actions">
                    <button className="btn btn-secondary" onClick={handleClearCart} disabled={cart.length === 0}>
                        Clear Cart
                    </button>
                    <button
                        className="btn btn-primary btn-large"
                        onClick={handleCheckout}
                        disabled={isCheckingOut || cart.length === 0}
                    >
                        {isCheckingOut ? 'Processing...' : 'Checkout'}
                    </button>
                </div>
            </div>

            <style>{`
                .pos-scan-row {
                    display: flex;
                    gap: var(--spacing-sm, 8px);
                    margin-bottom: 1.5rem;
                }
                .pos-scan-input {
                    flex: 1;
                }
                .pos-search-results {
                    display: flex;
                    flex-direction: column;
                    gap: var(--spacing-md, 16px);
                    margin-bottom: 1.5rem;
                }
                .pos-search-hint {
                    font-weight: 600;
                    color: var(--text-secondary);
                }
                .pos-cart-section {
                    margin-bottom: 1.5rem;
                }
                .table-responsive {
                    overflow-x: auto;
                    background: var(--bg-card);
                    border-radius: 8px;
                    box-shadow: var(--shadow-sm);
                }
                .data-table {
                    width: 100%;
                    border-collapse: collapse;
                    min-width: 700px;
                    color: var(--text-primary);
                }
                .data-table th, .data-table td {
                    padding: 12px 16px;
                    text-align: left;
                    border-bottom: 1px solid var(--border-color);
                    vertical-align: middle;
                }
                .data-table th {
                    background-color: var(--bg-elevated);
                    font-weight: 600;
                    color: var(--text-secondary);
                }
                .pos-row-custom {
                    border-left: 3px solid var(--accent-warning);
                }
                .pos-qty-input {
                    width: 80px;
                    padding: 8px;
                }
                .pos-price-input {
                    width: 100px;
                    padding: 8px;
                }
                .pos-line-total {
                    font-weight: 600;
                }
                .pos-remove-btn {
                    background: none;
                    border: none;
                    color: var(--accent-danger);
                    cursor: pointer;
                    padding: 6px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 6px;
                    transition: background-color 0.15s ease;
                }
                .pos-remove-btn:hover {
                    background-color: rgba(239, 68, 68, 0.1);
                }
                .badge {
                    display: inline-block;
                    padding: 2px 8px;
                    border-radius: 4px;
                    font-size: 0.75rem;
                    font-weight: 600;
                }
                .badge-warning {
                    background-color: rgba(245, 158, 11, 0.2);
                    color: var(--accent-warning);
                }
                .pos-custom-badge {
                    margin-left: 8px;
                    vertical-align: middle;
                }
                .pos-cart-cards {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }
                .pos-cart-card {
                    background: var(--bg-card);
                    border-radius: 8px;
                    padding: 1rem;
                    box-shadow: var(--shadow-sm);
                    border-left: 3px solid transparent;
                }
                .pos-cart-card.pos-row-custom {
                    border-left-color: var(--accent-warning);
                }
                .pos-cart-card-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 0.5rem;
                }
                .pos-cart-card-title {
                    font-weight: 600;
                }
                .pos-cart-card-sub {
                    font-size: 0.85rem;
                    color: var(--text-secondary);
                }
                .pos-cart-card-row {
                    display: flex;
                    gap: 1rem;
                    margin: 0.75rem 0;
                }
                .pos-cart-card-field {
                    flex: 1;
                }
                .pos-cart-card-field label {
                    display: block;
                    font-size: 0.8rem;
                    color: var(--text-secondary);
                    margin-bottom: 4px;
                }
                .pos-cart-card-total {
                    text-align: right;
                    font-size: 0.95rem;
                    padding-top: 0.5rem;
                    border-top: 1px solid var(--border-color);
                }
                .pos-footer {
                    background: var(--bg-card);
                    border-radius: 8px;
                    box-shadow: var(--shadow-sm);
                    padding: 1rem 1.25rem;
                    display: flex;
                    flex-wrap: wrap;
                    gap: 1rem;
                    justify-content: space-between;
                    align-items: center;
                    position: sticky;
                    bottom: 0;
                }
                .pos-footer-summary {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                    min-width: 180px;
                }
                .pos-summary-row {
                    display: flex;
                    justify-content: space-between;
                    gap: 1.5rem;
                    font-size: 0.9rem;
                    color: var(--text-secondary);
                }
                .pos-summary-total {
                    font-size: 1.1rem;
                    font-weight: 700;
                    color: var(--text-primary);
                }
                .pos-discount-row {
                    align-items: center;
                }
                .pos-discount-input {
                    width: 90px;
                    padding: 4px 8px;
                    text-align: right;
                }
                .pos-footer-actions {
                    display: flex;
                    gap: 0.75rem;
                }
                /* Compact mobile styles */
                @media (max-width: 768px) {
                    .pos-scan-row {
                        flex-direction: column;
                    }
                    .data-table th, .data-table td {
                        padding: 8px 10px;
                        font-size: 0.9rem;
                    }
                    .pos-footer {
                        flex-direction: column;
                        align-items: stretch;
                    }
                    .pos-footer-actions {
                        flex-direction: column;
                    }
                    .pos-footer-actions .btn {
                        width: 100%;
                    }
                }
            `}</style>
        </section>
    );
}
