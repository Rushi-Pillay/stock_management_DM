import { X, Edit, ShoppingCart, Printer } from 'lucide-react';
import { formatCurrency, getStockClass } from '../utils/format';
import Barcode from 'react-barcode';
import { useRef } from 'react';

export default function ItemDetailModal({ item, isOpen, onClose, onEdit, onSell }) {
    if (!isOpen || !item) return null;

    const stockClass = getStockClass(item.quantity);

    const handlePrint = () => {
        const printWindow = window.open('', '', 'width=600,height=600');
        if (!printWindow) return;

        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Print Label</title>
                <style>
                    body {
                        margin: 0;
                        padding: 0;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        height: 100vh;
                        font-family: sans-serif;
                    }
                    .label-container {
                        width: 300px; /* Adjust based on label size, e.g. 62mm is approx 234px at 96dpi, but browsers scale */
                        text-align: center;
                        padding: 10px;
                        border: 1px dashed #ccc; /* Visible on screen only */
                    }
                    @media print {
                        .label-container {
                            border: none;
                            width: 100%;
                            padding: 0;
                        }
                        @page {
                            margin: 0;
                            size: auto;
                        }
                    }
                    .org-name { font-weight: bold; font-size: 14px; margin-bottom: 5px; }
                    .item-name { font-size: 16px; margin-bottom: 5px; font-weight: bold; }
                    .price { font-size: 18px; font-weight: bold; margin-bottom: 5px; }
                    .meta { font-size: 10px; color: #555; }
                </style>
            </head>
            <body>
                <div class="label-container">
                    <div class="org-name">Dismantled Motors</div>
                    <div class="item-name">${item.description}</div>
                    <div class="meta">${item.stockNumber}</div>
                    <div class="price">${formatCurrency(item.sellingPrice)}</div>
                    <div id="barcode-container"></div>
                </div>
                <script>
                    window.onload = function() {
                        window.print();
                        // window.close(); // Optional: close after print
                    }
                </script>
            </body>
            </html>
        `;

        printWindow.document.write(htmlContent);
        printWindow.document.close();

        // We need to render the barcode into the new window. 
        // Since react-barcode is a React component, we can't just stringify it easily into valid SVG HTML string without rendering.
        // A simple trick is to generate it here hidden, or just use a pure JS barcode lib.
        // But since we installed react-barcode, let's try to grab the SVG from a hidden ref if possible, or just let the print window handle it if we used a JS lib.
        // Actually, simplest way with React is to use ReactDOMServer to render static markup, but that adds backend complexity or bloated imports.
        // Alternative: Use JsBarcode via CDN in the print window.

        // Let's inject JsBarcode script into the print window
        const script = printWindow.document.createElement('script');
        script.src = "https://cdn.jsdelivr.net/npm/jsbarcode@3.11.0/dist/JsBarcode.all.min.js";
        script.onload = () => {
            const script2 = printWindow.document.createElement('script');
            script2.textContent = `
                JsBarcode("#barcode-container", "${item.barcode || item.stockNumber}", {
                    format: "CODE128",
                    width: 2,
                    height: 50,
                    displayValue: true
                });
             `;
            printWindow.document.body.appendChild(script2);
        };
        printWindow.document.head.appendChild(script);

        // Change the internal element from div to svg for JsBarcode
        const barcodeDiv = printWindow.document.getElementById('barcode-container');
        const svg = printWindow.document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.id = "barcode-container";
        barcodeDiv.replaceWith(svg);
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
                            {/* Visual barcode preview */}
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
                </div>

                <div className="detail-actions">
                    <button className="btn btn-secondary" onClick={() => onEdit(item)}>
                        <Edit className="btn-icon" size={18} />
                        Edit
                    </button>
                    <button className="btn btn-secondary" onClick={handlePrint} title="Print Label" style={{ backgroundColor: '#6b7280', color: 'white' }}>
                        <Printer className="btn-icon" size={18} />
                        Print
                    </button>
                    <button className="btn btn-primary" onClick={() => onSell(item)}>
                        <ShoppingCart className="btn-icon" size={18} />
                        Sell
                    </button>
                </div>
            </div>
        </div>
    );
}
