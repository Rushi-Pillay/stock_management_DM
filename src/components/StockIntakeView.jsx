import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { useInventory } from '../contexts/InventoryContext';
import { useToast } from '../contexts/ToastContext';
import { formatCurrency } from '../utils/format';
import { Plus, Minus, Trash2, PackagePlus, PackageCheck, Camera, StopCircle } from 'lucide-react';
import ItemCard from './ItemCard';

// Minimum time between accepted scans of the same code, so holding an item
// in front of the camera doesn't add it to the batch a dozen times over.
const SCAN_COOLDOWN_MS = 1500;

// Persist the in-progress intake batch across view switches (and page
// reloads) so leaving the screen mid-delivery doesn't lose the count.
const INTAKE_STORAGE_KEY = 'stock_intake_cart_state';

function loadPersistedCart() {
    try {
        const raw = localStorage.getItem(INTAKE_STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

export default function StockIntakeView({ isDesktop }) {
    const { items, receiveStock } = useInventory();
    const { showToast } = useToast();

    const [code, setCode] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [cart, setCart] = useState(() => loadPersistedCart());
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const inputRef = useRef(null);
    const scannerRef = useRef(null);
    const lastScanRef = useRef({ code: null, time: 0 });

    useEffect(() => {
        localStorage.setItem(INTAKE_STORAGE_KEY, JSON.stringify(cart));
    }, [cart]);

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
        const existing = cart.find(line => line.id === item.id);

        if (existing) {
            setCart(cart.map(line =>
                line.id === item.id ? { ...line, quantity: line.quantity + 1 } : line
            ));
        } else {
            setCart([...cart, {
                id: item.id,
                description: item.description,
                stockNumber: item.stockNumber,
                currentStock: Number(item.quantity) || 0,
                quantity: 1,
                costPrice: Number(item.costPrice) || 0
            }]);
        }

        showToast(`${item.description} added to batch`, 'success');
        setSearchResults([]);
        setCode('');
        refocusInput();
    };

    const handleLookup = (overrideCode) => {
        const trimmed = (overrideCode ?? code).trim();
        if (!trimmed) return;

        const exactMatch = items.find(item => item.barcode === trimmed);
        if (exactMatch) {
            addToCart(exactMatch);
            return;
        }

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
            showToast('Item not found. Add it via Search first if it\'s brand new.', 'warning');
            setCode('');
            refocusInput();
        }
    };

    // Camera QR/barcode scanning for mobile devices. Unlike the Scan tab,
    // this keeps the camera running after each hit (a cooldown blocks
    // re-adding the same code immediately) so a whole delivery box can be
    // scanned item-by-item without restarting the camera each time.
    const handleScanSuccess = (decodedText) => {
        const now = Date.now();
        if (lastScanRef.current.code === decodedText && (now - lastScanRef.current.time) < SCAN_COOLDOWN_MS) {
            return;
        }
        lastScanRef.current = { code: decodedText, time: now };
        handleLookup(decodedText);
    };

    const startScanner = async () => {
        try {
            if (!window.isSecureContext) {
                showToast('Camera requires a secure context (HTTPS or localhost)', 'error');
                return;
            }
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                showToast('Camera API not present. Are you on HTTPS?', 'error');
                return;
            }
            if (!document.getElementById('intake-scanner-viewport')) {
                showToast('Scanner display element missing', 'error');
                return;
            }

            const scanner = new Html5Qrcode('intake-scanner-viewport');
            scannerRef.current = scanner;

            try {
                await navigator.mediaDevices.getUserMedia({ video: true });
            } catch (permErr) {
                showToast(`Permission denied: ${permErr.message}`, 'error');
                return;
            }

            const config = {
                fps: 15,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0,
                formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE]
            };

            await scanner.start(
                { facingMode: 'environment' },
                config,
                handleScanSuccess,
                () => {
                    // minor per-frame scan misses, ignore
                }
            );

            setIsScanning(true);
            showToast('Scanner active - scan items one after another', 'success');
        } catch (err) {
            console.error('Scanner error:', err);
            showToast(`Start failed: ${err.message || err}`, 'error');
        }
    };

    const stopScanner = async () => {
        if (scannerRef.current) {
            try {
                if (scannerRef.current.isScanning) {
                    await scannerRef.current.stop();
                }
                scannerRef.current.clear();
            } catch (err) {
                console.error('Stop scanner error:', err);
            }
        }
        setIsScanning(false);
    };

    // Stop the camera if the user navigates away mid-scan.
    useEffect(() => {
        return () => {
            if (scannerRef.current && scannerRef.current.isScanning) {
                scannerRef.current.stop().catch(console.error);
            }
        };
    }, []);

    const adjustQuantity = (id, delta) => {
        setCart(cart.map(line => {
            if (line.id !== id) return line;
            const next = line.quantity + delta;
            return { ...line, quantity: next < 1 ? 1 : next };
        }));
    };

    const setQuantity = (id, rawValue) => {
        let qty = parseInt(rawValue, 10);
        if (isNaN(qty) || qty < 1) qty = 1;
        setCart(cart.map(line => line.id === id ? { ...line, quantity: qty } : line));
    };

    const updateCostPrice = (id, rawValue) => {
        let price = parseFloat(rawValue);
        if (isNaN(price) || price < 0) price = 0;
        setCart(cart.map(line => line.id === id ? { ...line, costPrice: price } : line));
    };

    const removeLine = (id) => {
        setCart(cart.filter(line => line.id !== id));
    };

    const handleClearCart = () => {
        if (cart.length === 0) return;
        if (window.confirm('Clear this stock intake batch?')) {
            setCart([]);
        }
    };

    const handleSubmit = async () => {
        if (cart.length === 0) {
            showToast('Add at least one item to the batch first', 'warning');
            return;
        }

        setIsSubmitting(true);
        try {
            const cartItems = cart.map(line => ({
                id: line.id,
                itemName: line.description,
                quantity: line.quantity,
                costPrice: line.costPrice
            }));

            const success = await receiveStock(cartItems);
            if (success) {
                setCart([]);
            }
            // On failure, receiveStock already shows its own error toast; leave batch untouched.
        } finally {
            setIsSubmitting(false);
        }
    };

    const totalUnits = cart.reduce((sum, line) => sum + line.quantity, 0);
    const totalCost = cart.reduce((sum, line) => sum + (line.quantity * line.costPrice), 0);

    return (
        <section className="view active intake-view">
            <div className="view-header" style={{ marginBottom: '1.5rem' }}>
                <h2><PackagePlus size={24} style={{ verticalAlign: 'middle', marginRight: '8px' }} />Stock Intake</h2>
                <p className="intake-subtitle">Scan or search, say how many arrived, and add it all to stock in one go.</p>
            </div>

            <div className="intake-camera-section">
                <div
                    id="intake-scanner-viewport"
                    className="intake-scanner-viewport"
                    style={{ display: isScanning ? 'block' : 'none' }}
                ></div>
                <button
                    className={`btn ${isScanning ? 'btn-danger' : 'btn-secondary'} intake-camera-btn`}
                    onClick={isScanning ? stopScanner : startScanner}
                >
                    {isScanning ? <StopCircle size={18} /> : <Camera size={18} />}
                    {isScanning ? 'Stop Camera' : 'Scan with Camera'}
                </button>
            </div>

            <div className="intake-scan-row">
                <input
                    ref={inputRef}
                    type="text"
                    className="intake-scan-input"
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
                <button className="btn btn-primary" onClick={() => handleLookup()}>
                    <Plus size={18} />
                    Add to Batch
                </button>
            </div>

            {searchResults.length > 0 && (
                <div className="intake-search-results">
                    <p className="intake-search-hint">Multiple matches found. Select an item:</p>
                    {searchResults.map(item => (
                        <ItemCard key={item.id} item={item} onClick={addToCart} />
                    ))}
                </div>
            )}

            {cart.length > 0 && (
                <div className="intake-summary-strip">
                    <div className="summary-stat">
                        <span className="summary-label">Line Items</span>
                        <span className="summary-value">{cart.length}</span>
                    </div>
                    <div className="summary-stat">
                        <span className="summary-label">Total Units</span>
                        <span className="summary-value">{totalUnits}</span>
                    </div>
                    <div className="summary-stat">
                        <span className="summary-label">Batch Cost</span>
                        <span className="summary-value">{formatCurrency(totalCost)}</span>
                    </div>
                </div>
            )}

            <div className="intake-cart-section">
                {cart.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon"><PackagePlus size={48} /></div>
                        <p className="empty-state-text">Batch is empty. Scan or search for an item to start receiving stock.</p>
                    </div>
                ) : (
                    <div className="intake-cart-cards">
                        {cart.map(line => (
                            <div key={line.id} className="intake-card">
                                <div className="intake-card-header">
                                    <div>
                                        <div className="intake-card-title">{line.description}</div>
                                        <div className="intake-card-sub">
                                            {line.stockNumber} &middot; currently {line.currentStock} in stock
                                        </div>
                                    </div>
                                    <button
                                        className="intake-remove-btn"
                                        onClick={() => removeLine(line.id)}
                                        title="Remove from batch"
                                        aria-label="Remove from batch"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>

                                <div className="intake-card-body">
                                    <div className="intake-stepper-field">
                                        <label>Quantity Received</label>
                                        <div className="intake-stepper">
                                            <button
                                                type="button"
                                                className="intake-stepper-btn"
                                                onClick={() => adjustQuantity(line.id, -1)}
                                                aria-label="Decrease quantity"
                                            >
                                                <Minus size={20} />
                                            </button>
                                            <input
                                                type="number"
                                                min="1"
                                                value={line.quantity}
                                                onChange={(e) => setQuantity(line.id, e.target.value)}
                                                className="intake-stepper-input"
                                            />
                                            <button
                                                type="button"
                                                className="intake-stepper-btn"
                                                onClick={() => adjustQuantity(line.id, 1)}
                                                aria-label="Increase quantity"
                                            >
                                                <Plus size={20} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="intake-cost-field">
                                        <label htmlFor={`intake-cost-${line.id}`}>Cost per Unit</label>
                                        <input
                                            type="number"
                                            id={`intake-cost-${line.id}`}
                                            min="0"
                                            step="0.01"
                                            value={line.costPrice}
                                            onChange={(e) => updateCostPrice(line.id, e.target.value)}
                                            className="intake-cost-input"
                                        />
                                    </div>
                                </div>

                                <div className="intake-card-total">
                                    New stock level: <strong>{Number(line.currentStock) + Number(line.quantity)}</strong>
                                    <span className="intake-line-cost">{formatCurrency(line.quantity * line.costPrice)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="intake-footer">
                <div className="intake-footer-summary">
                    <span>Adding <strong>{totalUnits}</strong> unit{totalUnits !== 1 ? 's' : ''} across <strong>{cart.length}</strong> item{cart.length !== 1 ? 's' : ''}</span>
                    <span className="intake-footer-cost">{formatCurrency(totalCost)}</span>
                </div>
                <div className="intake-footer-actions">
                    <button className="btn btn-secondary" onClick={handleClearCart} disabled={cart.length === 0}>
                        Clear Batch
                    </button>
                    <button
                        className="btn btn-success btn-large"
                        onClick={handleSubmit}
                        disabled={isSubmitting || cart.length === 0}
                    >
                        <PackageCheck size={20} style={{ marginRight: '8px' }} />
                        {isSubmitting ? 'Adding to Stock...' : 'Add to Stock'}
                    </button>
                </div>
            </div>

            <style>{`
                .intake-subtitle {
                    margin: 4px 0 0;
                    color: var(--text-secondary);
                    font-size: 0.95rem;
                }
                .intake-camera-section {
                    margin-bottom: 1rem;
                    text-align: center;
                }
                .intake-scanner-viewport {
                    width: 100%;
                    max-width: 400px;
                    margin: 0 auto 1rem;
                    border-radius: 12px;
                    overflow: hidden;
                }
                .intake-camera-btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                }
                .intake-scan-row {
                    display: flex;
                    gap: 8px;
                    margin-bottom: 1.5rem;
                }
                .intake-scan-input {
                    flex: 1;
                    font-size: 1.05rem;
                    padding: 12px 14px;
                }
                .intake-search-results {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                    margin-bottom: 1.5rem;
                }
                .intake-search-hint {
                    font-weight: 600;
                    color: var(--text-secondary);
                }
                .intake-summary-strip {
                    display: flex;
                    gap: 1rem;
                    margin-bottom: 1.5rem;
                    flex-wrap: wrap;
                }
                .summary-stat {
                    background: var(--bg-card);
                    border-radius: 8px;
                    box-shadow: var(--shadow-sm);
                    padding: 12px 20px;
                    display: flex;
                    flex-direction: column;
                    min-width: 140px;
                    border-left: 3px solid var(--accent-success);
                }
                .summary-label {
                    font-size: 0.8rem;
                    color: var(--text-secondary);
                    font-weight: 600;
                }
                .summary-value {
                    font-size: 1.4rem;
                    font-weight: 700;
                    color: var(--text-primary);
                }
                .intake-cart-section {
                    margin-bottom: 1.5rem;
                }
                .intake-cart-cards {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }
                .intake-card {
                    background: var(--bg-card);
                    border-radius: 12px;
                    padding: 1.1rem;
                    box-shadow: var(--shadow-sm);
                    border-left: 4px solid var(--accent-success);
                }
                .intake-card-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 0.85rem;
                }
                .intake-card-title {
                    font-weight: 700;
                    font-size: 1.02rem;
                    color: var(--text-primary);
                }
                .intake-card-sub {
                    font-size: 0.82rem;
                    color: var(--text-secondary);
                    margin-top: 2px;
                }
                .intake-remove-btn {
                    background: none;
                    border: none;
                    color: var(--accent-danger);
                    cursor: pointer;
                    padding: 6px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 8px;
                    transition: background-color 0.15s ease;
                }
                .intake-remove-btn:hover {
                    background-color: rgba(239, 68, 68, 0.1);
                }
                .intake-card-body {
                    display: flex;
                    flex-direction: column;
                    gap: 0.85rem;
                    margin-bottom: 0.75rem;
                }
                .intake-stepper-field label,
                .intake-cost-field label {
                    display: block;
                    font-size: 0.78rem;
                    font-weight: 600;
                    color: var(--text-secondary);
                    margin-bottom: 6px;
                }
                .intake-stepper {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }
                .intake-stepper-btn {
                    width: 36px;
                    height: 36px;
                    border-radius: 8px;
                    border: 1px solid var(--border-color);
                    background: var(--bg-elevated);
                    color: var(--text-primary);
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: background-color 0.15s ease;
                }
                .intake-stepper-btn:hover {
                    background-color: var(--accent-success);
                    color: white;
                }
                .intake-stepper-input {
                    width: 60px;
                    height: 36px;
                    text-align: center;
                    font-size: 1.05rem;
                    font-weight: 700;
                    padding: 0;
                }
                .intake-cost-input {
                    width: 100px;
                    padding: 8px;
                }
                .intake-card-total {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    font-size: 0.88rem;
                    color: var(--text-secondary);
                    padding-top: 0.6rem;
                    border-top: 1px solid var(--border-color);
                }
                .intake-card-total strong {
                    color: var(--accent-success);
                }
                .intake-line-cost {
                    font-weight: 700;
                    color: var(--text-primary);
                }
                .intake-footer {
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
                .intake-footer-summary {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                    font-size: 0.95rem;
                    color: var(--text-secondary);
                }
                .intake-footer-cost {
                    font-size: 1.2rem;
                    font-weight: 700;
                    color: var(--text-primary);
                }
                .intake-footer-actions {
                    display: flex;
                    gap: 0.75rem;
                }
                .btn-success {
                    background-color: var(--accent-success);
                    color: white;
                    border: none;
                }
                .btn-success:hover:not(:disabled) {
                    filter: brightness(0.95);
                }
                .btn-success:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }
                @media (max-width: 768px) {
                    .intake-scan-row {
                        flex-direction: column;
                    }
                    .intake-footer {
                        flex-direction: column;
                        align-items: stretch;
                    }
                    .intake-footer-actions {
                        flex-direction: column;
                    }
                    .intake-footer-actions .btn {
                        width: 100%;
                    }
                }
            `}</style>
        </section>
    );
}
