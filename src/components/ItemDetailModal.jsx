import { X, Edit, ShoppingCart, Printer, Settings } from 'lucide-react';
import { formatCurrency, getStockClass } from '../utils/format';
import Barcode from 'react-barcode';
import { useRef, useState, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { useToast } from '../contexts/ToastContext';

// Label size definitions (must match printer-server label keys)
const LABEL_OPTIONS = [
    { id: '62_continuous', name: '62mm Continuous (DK-22205)', widthPx: 240, heightPx: 0 },
    { id: '62x100', name: '62×100mm Shipping (DK-11202)', widthPx: 240, heightPx: 388 },
    { id: '62x29', name: '62×29mm Address (DK-11209)', widthPx: 240, heightPx: 112 },
    { id: '29x90', name: '29×90mm Standard (DK-11201)', widthPx: 112, heightPx: 348 },
    { id: '29x62', name: '29×62mm Small (DK-11209)', widthPx: 112, heightPx: 240 },
    { id: '29_continuous', name: '29mm Continuous (DK-22210)', widthPx: 112, heightPx: 0 },
    { id: '17x54', name: '17×54mm Multi (DK-11204)', widthPx: 66, heightPx: 210 },
    { id: '17x87', name: '17×87mm File (DK-11203)', widthPx: 66, heightPx: 338 },
    { id: '12_continuous', name: '12mm Continuous (DK-22214)', widthPx: 46, heightPx: 0 },
];

export default function ItemDetailModal({ item, isOpen, onClose, onEdit, onSell }) {
    const { showToast } = useToast();
    const [printerIp, setPrinterIp] = useState('');
    const [labelSize, setLabelSize] = useState('62_continuous');
    const [showPrinterConfig, setShowPrinterConfig] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);
    const printRef = useRef(null);

    useEffect(() => {
        const savedIp = localStorage.getItem('printer_ip');
        if (savedIp) setPrinterIp(savedIp);
        const savedLabel = localStorage.getItem('label_size');
        if (savedLabel) setLabelSize(savedLabel);
    }, []);

    const savePrinterIp = (ip) => {
        setPrinterIp(ip);
        localStorage.setItem('printer_ip', ip);
    };

    const saveLabelSize = (size) => {
        setLabelSize(size);
        localStorage.setItem('label_size', size);
    };

    if (!isOpen || !item) return null;

    const stockClass = getStockClass(item.quantity);
    const selectedLabel = LABEL_OPTIONS.find(l => l.id === labelSize) || LABEL_OPTIONS[0];

    // Determine print template dimensions based on label
    const templateWidth = selectedLabel.widthPx;
    // For continuous labels, let the template auto-height; for die-cut, constrain
    const templateStyle = {
        width: `${templateWidth}px`,
        ...(selectedLabel.heightPx > 0 ? { height: `${selectedLabel.heightPx}px` } : {}),
        padding: templateWidth > 100 ? '15px' : '8px',
        background: 'white',
        color: 'black',
        textAlign: 'center',
        fontFamily: 'sans-serif',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
    };

    // Scale font sizes based on label width
    const isSmallLabel = templateWidth < 120;
    const titleSize = isSmallLabel ? '8px' : '14px';
    const stockNumSize = isSmallLabel ? '7px' : '12px';
    const descSize = isSmallLabel ? '9px' : '16px';
    const priceSize = isSmallLabel ? '11px' : '20px';
    const barcodeWidth = isSmallLabel ? 1.0 : 1.8;
    const barcodeHeight = isSmallLabel ? 25 : 50;

    const handleNetworkPrint = async () => {
        if (!printerIp) {
            setShowPrinterConfig(true);
            showToast('Please set Printer IP first', 'warning');
            return;
        }

        setIsPrinting(true);
        try {
            // Short delay to ensure ref is ready
            await new Promise(resolve => setTimeout(resolve, 100));

            if (!printRef.current) {
                throw new Error("Print element not found");
            }

            const canvas = await html2canvas(printRef.current, {
                scale: 3, // High resolution for 300dpi printer
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
                    image: base64Image,
                    labelSize: labelSize
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
                                Printer IP Address:
                            </label>
                            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                <input
                                    type="text"
                                    placeholder="e.g. 192.168.1.50"
                                    value={printerIp}
                                    onChange={(e) => savePrinterIp(e.target.value)}
                                    style={{ flex: 1, padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
                                />
                            </div>

                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.9rem' }}>
                                Label Size:
                            </label>
                            <select
                                value={labelSize}
                                onChange={(e) => saveLabelSize(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '0.5rem',
                                    borderRadius: '4px',
                                    border: '1px solid #ccc',
                                    backgroundColor: 'white',
                                    fontSize: '0.85rem',
                                    marginBottom: '0.5rem'
                                }}
                            >
                                {LABEL_OPTIONS.map(opt => (
                                    <option key={opt.id} value={opt.id}>{opt.name}</option>
                                ))}
                            </select>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                                <button className="btn btn-secondary" onClick={() => setShowPrinterConfig(false)}>Done</button>
                            </div>

                            <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.5rem' }}>
                                Uses Brother QL-810W raster protocol (TCP port 9100). Bridge server must be running.
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

                {/* Hidden Label Template — dynamically sized based on selected label */}
                <div style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
                    <div ref={printRef} style={templateStyle}>
                        <div style={{ fontSize: titleSize, fontWeight: 'bold', marginBottom: '2px' }}>Dismantled Motors</div>
                        <div style={{ fontSize: stockNumSize, marginBottom: '1px' }}>{item.stockNumber}</div>
                        <div style={{ fontSize: descSize, fontWeight: 'bold', margin: '3px 0' }}>{item.description}</div>
                        <div style={{ fontSize: priceSize, fontWeight: 'bold', marginBottom: '4px' }}>{formatCurrency(item.sellingPrice)}</div>
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <Barcode
                                value={item.barcode || item.stockNumber}
                                width={barcodeWidth}
                                height={barcodeHeight}
                                fontSize={isSmallLabel ? 8 : 12}
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
