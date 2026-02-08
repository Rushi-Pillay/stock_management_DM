import { X, Edit, ShoppingCart } from 'lucide-react';
import { formatCurrency, getStockClass } from '../utils/format';

export default function ItemDetailModal({ item, isOpen, onClose, onEdit, onSell }) {
    if (!isOpen || !item) return null;

    const stockClass = getStockClass(item.quantity);

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
                        <span className="detail-value">{item.barcode || 'N/A'}</span>
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
                    <button className="btn btn-primary" onClick={() => onSell(item)}>
                        <ShoppingCart className="btn-icon" size={18} />
                        Sell / Remove Stock
                    </button>
                </div>
            </div>
        </div>
    );
}
