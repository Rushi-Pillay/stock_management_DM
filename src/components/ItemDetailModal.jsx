import { X, Edit, ShoppingCart, Printer, Settings } from 'lucide-react';
import { formatCurrency, getStockClass } from '../utils/format';
import Barcode from 'react-barcode';
import { useRef, useState, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { useToast } from '../contexts/ToastContext';

export default function ItemDetailModal({ item, isOpen, onClose, onEdit, onSell }) {
    const { showToast } = useToast();
    const [printerIp, setPrinterIp] = useState('');
    const [showPrinterConfig, setShowPrinterConfig] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);
    const printRef = useRef(null);

    useEffect(() => {
        const savedIp = localStorage.getItem('printer_ip');
        if (savedIp) setPrinterIp(savedIp);
    }, []);

    const savePrinterIp = (ip) => {
        setPrinterIp(ip);
        localStorage.setItem('printer_ip', ip);
    };

    if (!isOpen || !item) return null;

    const stockClass = getStockClass(item.quantity);

    const handleNetworkPrint = async () => {
        if (!printerIp) {
            setShowPrinterConfig(true);
            showToast('Please set Printer IP first', 'warning');
            return;
        }

        setIsPrinting(true);
        try {
            // Short delay to ensure ref is ready if hidden
            await new Promise(resolve => setTimeout(resolve, 100));

            if (!printRef.current) {
                throw new Error("Print element not found");
            }

            const canvas = await html2canvas(printRef.current, {
                scale: 3, // Higher scale for 300dpi printers like QL-810W
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            });

            const base64Image = canvas.toDataURL('image/png');

            showToast('Sending to printer...', 'info');

            const response = await fetch('http://localhost:3001/print', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ip: printerIp,
                    image: base64Image
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Print failed');
            }

            const result = await response.json();
            if (result.success) {
                showToast('Label printed successfully!', 'success');
            } else {
                throw new Error(result.error || 'Unknown error');
            }

        } catch (err) {
            console.error('Print error:', err);
            showToast(`Print Error: ${err.message}. Is the bridge server running?`, 'error');
        } finally {
            setIsPrinting(false);
        }
    };

    return (
        <div className="modal active">
            <div className="modal-content">
                <div className="modal-header">
                    <h2>Item Details</h2>
                    <button className="close-modal-btn" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                <div id="item-details">
                    <div className="detail-row">
                        <span className="detail-label">Barcode</span>
                        <div style={{ textAlign: 'right' }}>
                            <span className="detail-value">{item.barcode || 'N/A'}</span>
                            {(item.barcode || item.stockNumber) && (
                                <div style={{ marginTop: '5px' }}>
                                    <Barcode
                                        value={item.barcode || item.stockNumber}
                                        width={1.5}
                                        height={40}
                                        fontSize={12}
                                        displayValue={false}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="detail-row">
                        <span className="detail-label">Stock Number</span>
                        <span className="detail-value">{item.stockNumber}</span>
                    </div>
                    <div className="detail-row">
                        <span className="detail-label">Supplier</span>
                        <span className="detail-value">{item.supplier}</span>
                    </div>
                    <div className="detail-row">
                        <span className="detail-label">Description</span>
                        <span className="detail-value">{item.description}</span>
                    </div>
                    <div className="detail-row">
                        <span className="detail-label">Cost Price</span>
                        <span className="detail-value">{formatCurrency(item.costPrice)}</span>
                    </div>
                    <div className="detail-row">
                        <span className="detail-label">Selling Price</span>
                        <span className="detail-value text-success">{formatCurrency(item.sellingPrice)}</span>
                    </div>
                    <div className="detail-row">
                        <span className="detail-label">In Stock</span>
                        <span className={`detail-value ${stockClass === 'out-of-stock' ? 'text-danger' :
                            stockClass === 'low-stock' ? 'text-warning' : 'text-success'}`}>
                            {item.quantity}
                        </span>
                    </div>

                    {showPrinterConfig && (
                        <div className="printer-config" style={{
                            marginTop: '1rem',
                            padding: '1rem',
                            background: '#f3f4f6',
                            borderRadius: '8px',
                            border: '1px solid #e5e7eb'
                        }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.9rem' }}>
                                Brother QL-810W IP Address:
                            </label>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <input
                                    type="text"
                                    placeholder="e.g. 192.168.1.50"
                                    value={printerIp}
                                    onChange={(e) => savePrinterIp(e.target.value)}
                                    style={{ flex: 1, padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
                                />
                                <button className="btn btn-secondary" onClick={() => setShowPrinterConfig(false)}>Save</button>
                            </div>
                            <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.5rem' }}>
                                Note: The bridge server must be running on this PC.
                            </p>
                        </div>
                    )}
                </div>

                <div className="detail-actions">
                    <button className="btn btn-secondary" onClick={() => onEdit(item)}>
                        <Edit className="btn-icon" size={18} />
                        Edit
                    </button>

                    <div style={{ display: 'flex', gap: '2px' }}>
                        <button
                            className="btn btn-secondary"
                            onClick={handleNetworkPrint}
                            disabled={isPrinting}
                            style={{ backgroundColor: '#4b5563', color: 'white' }}
                        >
                            <Printer className="btn-icon" size={18} />
                            {isPrinting ? 'Printing...' : 'Direct Print'}
                        </button>
                        <button
                            className="btn btn-secondary"
                            onClick={() => setShowPrinterConfig(!showPrinterConfig)}
                            style={{ padding: '0 8px' }}
                        >
                            <Settings size={18} />
                        </button>
                    </div>

                    <button className="btn btn-primary" onClick={() => onSell(item)}>
                        <ShoppingCart className="btn-icon" size={18} />
                        Sell
                    </button>
                </div>

                {/* Hidden Template for Brother QL-810W (optimized for 62mm roll) */}
                <div style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
                    <div ref={printRef} style={{
                        width: '240px', // Standard 62mm width at screen resolution
                        padding: '15px',
                        background: 'white',
                        color: 'black',
                        textAlign: 'center',
                        fontFamily: 'sans-serif'
                    }}>
                        <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' }}>Dismantled Motors</div>
                        <div style={{ fontSize: '12px', marginBottom: '2px' }}>{item.stockNumber}</div>
                        <div style={{ fontSize: '16px', fontWeight: 'bold', margin: '4px 0' }}>{item.description}</div>
                        <div style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px' }}>{formatCurrency(item.sellingPrice)}</div>
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <Barcode
                                value={item.barcode || item.stockNumber}
                                width={1.8}
                                height={50}
                                fontSize={12}
                                displayValue={true}
                                background="#ffffff"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
