import { useState } from 'react';
import { X, Trash2 } from 'lucide-react';

export default function SellModal({ item, isOpen, onClose, onConfirm }) {
    const [quantity, setQuantity] = useState(1);

    if (!isOpen || !item) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        onConfirm(item.id, parseInt(quantity));
        onClose();
    };

    return (
        <div className="modal active">
            <div className="modal-content modal-small">
                <div className="modal-header">
                    <h2>Remove Stock</h2>
                    <button className="close-modal-btn" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <p className="sell-item-info">{item.description}</p>
                    <p className="current-stock">
                        Current stock: <strong>{item.quantity}</strong>
                    </p>

                    <div className="form-group">
                        <label htmlFor="sell-quantity">Quantity to Remove *</label>
                        <input
                            type="number"
                            id="sell-quantity"
                            required
                            min="1"
                            max={item.quantity}
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                        />
                    </div>

                    <div className="form-actions">
                        <button type="button" className="btn btn-secondary cancel-btn" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn btn-danger">Confirm Removal</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
