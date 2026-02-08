import { formatCurrency, getStockClass } from '../utils/format';
import { Package, Factory } from 'lucide-react';

export default function ItemCard({ item, onClick }) {
    const stockClass = getStockClass(item.quantity);
    const stockText = item.quantity === 0 ? 'Out of Stock' : `${item.quantity} in stock`;

    return (
        <div className="item-card" onClick={() => onClick(item)}>
            <div className="item-card-header">
                <span className="item-name">{item.description}</span>
                <span className={`item-stock ${stockClass}`}>{stockText}</span>
            </div>

            <div className="item-meta">
                <div className="meta-item">
                    <Package size={14} />
                    <span>{item.stockNumber}</span>
                </div>
                <div className="meta-item">
                    <Factory size={14} />
                    <span>{item.supplier}</span>
                </div>
            </div>

            <div className="item-prices">
                <div className="price-tag">
                    <span className="label">Cost: </span>
                    <span className="value">{formatCurrency(item.costPrice)}</span>
                </div>
                <div className="price-tag">
                    <span className="label">Sell: </span>
                    <span className="value">{formatCurrency(item.sellingPrice)}</span>
                </div>
            </div>
        </div>
    );
}
