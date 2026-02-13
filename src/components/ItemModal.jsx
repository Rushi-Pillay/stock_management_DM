import { useState, useEffect } from 'react';
import { X, Trash2 } from 'lucide-react';

export default function ItemModal({ isOpen, onClose, onSave, onDelete, initialData }) {
    const [formData, setFormData] = useState({
        barcode: '',
        stockNumber: '',
        supplier: '',
        description: '',
        costPrice: '',
        sellingPrice: '',
        quantity: ''
    });

    useEffect(() => {
        if (initialData) {
            setFormData(initialData);
        } else {
            setFormData({
                barcode: '',
                stockNumber: '',
                supplier: '',
                description: '',
                costPrice: '',
                sellingPrice: '',
                quantity: ''
            });
        }
    }, [initialData, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
        onClose();
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    return (
        <div className="modal active">
            <div className="modal-content">
                <div className="modal-header">
                    <h2>{initialData?.id ? 'Edit Item' : 'Add New Item'}</h2>
                    <button className="close-modal-btn" onClick={onClose}><X size={24} /></button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="barcode">Barcode</label>
                        <input
                            type="text"
                            name="barcode"
                            value={formData.barcode || ''}
                            onChange={handleChange}
                            placeholder="Barcode (optional)"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="stockNumber">Stock Number *</label>
                        <input
                            type="text"
                            name="stockNumber"
                            value={formData.stockNumber}
                            onChange={handleChange}
                            required
                            placeholder="e.g., SKU-001"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="supplier">Supplier *</label>
                        <input
                            type="text"
                            name="supplier"
                            value={formData.supplier}
                            onChange={handleChange}
                            required
                            placeholder="Supplier name"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="description">Description *</label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            required
                            placeholder="Item description"
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="costPrice">Cost Price *</label>
                            <input
                                type="number"
                                name="costPrice"
                                value={formData.costPrice}
                                onChange={handleChange}
                                required
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="sellingPrice">Selling Price *</label>
                            <input
                                type="number"
                                name="sellingPrice"
                                value={formData.sellingPrice}
                                onChange={handleChange}
                                required
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="quantity">Amount in Stock *</label>
                        <input
                            type="number"
                            name="quantity"
                            value={formData.quantity}
                            onChange={handleChange}
                            required
                            min="0"
                            placeholder="0"
                        />
                    </div>

                    <div className="form-actions" style={{ justifyContent: 'space-between' }}>
                        {initialData?.id && onDelete && (
                            <button
                                type="button"
                                className="btn btn-danger"
                                onClick={() => onDelete(initialData.id)}
                                style={{ backgroundColor: '#ef4444', color: 'white' }}
                            >
                                <Trash2 size={18} style={{ marginRight: '5px' }} />
                                Delete Item
                            </button>
                        )}
                        <div style={{ display: 'flex', gap: '10px', marginLeft: 'auto' }}>
                            <button type="button" className="btn btn-secondary cancel-btn" onClick={onClose}>Cancel</button>
                            <button type="submit" className="btn btn-primary">Save Item</button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
