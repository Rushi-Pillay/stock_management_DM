import { useInventory } from '../contexts/InventoryContext';
import { formatCurrency } from '../utils/format';
import { RefreshCw } from 'lucide-react';

export default function TransactionsView() {
    const { transactions, loadTransactions } = useInventory();

    const formatDate = (dateString) => {
        try {
            return new Date(dateString).toLocaleString();
        } catch (e) {
            return dateString;
        }
    };

    return (
        <section className="view active">
            <div className="view-header" style={{ marginBottom: '1.5rem' }}>
                <h2>Transactions Log</h2>
                <button className="btn btn-secondary" onClick={loadTransactions}>
                    <RefreshCw size={18} />
                    Refresh
                </button>
            </div>

            <div className="table-responsive">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>User</th>
                            <th>Type</th>
                            <th>Item</th>
                            <th>Quantity</th>
                            <th>Cost Price</th>
                            <th>Sale Price</th>
                            <th>Total Cost</th>
                            <th>Total Sales</th>
                            <th>Reason</th>
                        </tr>
                    </thead>
                    <tbody>
                        {transactions.length === 0 ? (
                            <tr>
                                <td colSpan="10" style={{ textAlign: 'center', padding: '2rem' }}>
                                    No transactions recorded yet.
                                </td>
                            </tr>
                        ) : (
                            transactions.map(t => (
                                <tr key={t.id} className={(t.type === 'OUT' || t.type === 'DELETE') ? 'row-out' : 'row-in'}>
                                    <td>{formatDate(t.timestamp)}</td>
                                    <td>
                                        <div style={{ display: 'flex', flexDirection: 'column', fontSize: '0.85rem' }}>
                                            <span style={{ fontWeight: 500 }}>{t.performedBy || 'Unknown'}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`badge ${(t.type === 'OUT' || t.type === 'DELETE') ? 'badge-danger' : 'badge-success'}`}>
                                            {t.type}
                                        </span>
                                    </td>
                                    <td>{t.itemName}</td>
                                    <td>
                                        {(t.type === 'OUT' || t.type === 'DELETE')
                                            ? (t.quantity > 0 ? -t.quantity : t.quantity)
                                            : (t.quantity > 0 ? `+${t.quantity}` : t.quantity)}
                                    </td>
                                    <td>{formatCurrency(t.costPrice)}</td>
                                    <td>{t.salePrice ? formatCurrency(t.salePrice) : '-'}</td>
                                    <td>{formatCurrency(t.totalCost)}</td>
                                    <td>{t.totalSales ? formatCurrency(t.totalSales) : '-'}</td>
                                    <td>{t.reason || '-'}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <style>{`
                .table-responsive {
                    overflow-x: auto;
                    background: var(--bg-card);
                    border-radius: 8px;
                    box-shadow: var(--shadow-sm);
                }
                .data-table {
                    width: 100%;
                    border-collapse: collapse;
                    min-width: 600px;
                    color: var(--text-primary);
                }
                .data-table th, .data-table td {
                    padding: 12px 16px;
                    text-align: left;
                    border-bottom: 1px solid var(--border-color);
                }
                .data-table th {
                    background-color: var(--bg-elevated);
                    font-weight: 600;
                    color: var(--text-secondary);
                }
                .row-out {
                    background-color: rgba(239, 68, 68, 0.05);
                }
                .row-in {
                    background-color: rgba(16, 185, 129, 0.05);
                }
                .badge {
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 0.8rem;
                    font-weight: 600;
                }
                .badge-success {
                    background-color: rgba(16, 185, 129, 0.2);
                    color: var(--accent-success);
                }
                .badge-danger {
                    background-color: rgba(239, 68, 68, 0.2);
                    color: var(--accent-danger);
                }
                /* Compact mobile styles */
                @media (max-width: 768px) {
                    .data-table th, .data-table td {
                        padding: 8px 10px;
                        font-size: 0.9rem;
                    }
                    .badge {
                        font-size: 0.7rem;
                        padding: 2px 6px;
                    }
                }
            `}</style>
        </section>
    );
}
