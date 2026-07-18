import { useState, useMemo, Fragment } from 'react';
import { useInventory } from '../contexts/InventoryContext';
import { formatCurrency } from '../utils/format';
import { RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';

export default function SalesView({ isDesktop }) {
    const { transactions, loadTransactions } = useInventory();
    const [expandedIds, setExpandedIds] = useState(new Set());

    const formatDate = (dateString) => {
        try {
            return new Date(dateString).toLocaleString();
        } catch (e) {
            return dateString;
        }
    };

    const toggleExpanded = (groupId) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            if (next.has(groupId)) {
                next.delete(groupId);
            } else {
                next.add(groupId);
            }
            return next;
        });
    };

    // Only actual sales (OUT). Group line items that share a saleId into a single sale row.
    // Legacy transactions without a saleId are treated as their own standalone sale group.
    const saleGroups = useMemo(() => {
        const outTransactions = transactions.filter(t => t.type === 'OUT');

        const groupMap = new Map();
        outTransactions.forEach(t => {
            const groupId = t.saleId || t.id;
            if (!groupMap.has(groupId)) {
                groupMap.set(groupId, []);
            }
            groupMap.get(groupId).push(t);
        });

        return Array.from(groupMap.entries()).map(([groupId, lines]) => {
            const totalSales = lines.reduce((sum, l) => sum + (Number(l.totalSales) || 0), 0);
            const totalCost = Math.abs(lines.reduce((sum, l) => sum + (Number(l.totalCost) || 0), 0));
            const profit = totalSales - totalCost;

            return {
                groupId,
                timestamp: lines[0].timestamp,
                performedBy: lines[0].performedBy,
                lines,
                totalSales,
                totalCost,
                profit
            };
        });
    }, [transactions]);

    const totalRevenue = saleGroups.reduce((sum, g) => sum + g.totalSales, 0);

    return (
        <section className="view active">
            <div className="view-header" style={{ marginBottom: '1.5rem' }}>
                <h2>Sales</h2>
                <button className="btn btn-secondary" onClick={loadTransactions}>
                    <RefreshCw size={18} />
                    Refresh
                </button>
            </div>

            <div className="sales-summary-strip">
                <div className="summary-stat">
                    <span className="summary-label">Total Sales</span>
                    <span className="summary-value">{saleGroups.length}</span>
                </div>
                <div className="summary-stat">
                    <span className="summary-label">Total Revenue</span>
                    <span className="summary-value">{formatCurrency(totalRevenue)}</span>
                </div>
            </div>

            <div className="table-responsive">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th></th>
                            <th>Date</th>
                            <th>User</th>
                            <th>Items</th>
                            <th>Total Sale</th>
                            <th>Total Cost</th>
                            <th>Profit</th>
                        </tr>
                    </thead>
                    <tbody>
                        {saleGroups.length === 0 ? (
                            <tr>
                                <td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>
                                    No transactions recorded yet.
                                </td>
                            </tr>
                        ) : (
                            saleGroups.map(group => {
                                const isExpanded = expandedIds.has(group.groupId);
                                return (
                                    <Fragment key={group.groupId}>
                                        <tr
                                            className="sale-row"
                                            onClick={() => toggleExpanded(group.groupId)}
                                        >
                                            <td className="expand-cell">
                                                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                            </td>
                                            <td>{formatDate(group.timestamp)}</td>
                                            <td>
                                                <div style={{ display: 'flex', flexDirection: 'column', fontSize: '0.85rem' }}>
                                                    <span style={{ fontWeight: 500 }}>{group.performedBy || 'Unknown'}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <span className="badge badge-success">
                                                    {group.lines.length} item{group.lines.length !== 1 ? 's' : ''}
                                                </span>
                                            </td>
                                            <td>{formatCurrency(group.totalSales)}</td>
                                            <td>{formatCurrency(group.totalCost)}</td>
                                            <td className={group.profit >= 0 ? 'profit-positive' : 'profit-negative'}>
                                                {formatCurrency(group.profit)}
                                            </td>
                                        </tr>
                                        {isExpanded && (
                                            <tr className="sale-detail-row">
                                                <td colSpan="7">
                                                    <div className="sale-line-items">
                                                        <table className="sale-line-table">
                                                            <thead>
                                                                <tr>
                                                                    <th>Item</th>
                                                                    <th>Quantity</th>
                                                                    <th>Unit Sale Price</th>
                                                                    <th>Line Total</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {group.lines.map(line => (
                                                                    <tr key={line.id}>
                                                                        <td>{line.itemName}</td>
                                                                        <td>{Math.abs(Number(line.quantity) || 0)}</td>
                                                                        <td>{line.salePrice ? formatCurrency(line.salePrice) : '-'}</td>
                                                                        <td>{line.totalSales ? formatCurrency(line.totalSales) : '-'}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </Fragment>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            <style>{`
                .sales-summary-strip {
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
                .sale-row {
                    cursor: pointer;
                }
                .sale-row:hover {
                    background-color: var(--bg-elevated);
                }
                .expand-cell {
                    width: 32px;
                    color: var(--text-secondary);
                }
                .sale-detail-row td {
                    padding: 0;
                    background-color: var(--bg-elevated);
                }
                .sale-line-items {
                    padding: 8px 16px 16px 48px;
                }
                .sale-line-table {
                    width: 100%;
                    border-collapse: collapse;
                }
                .sale-line-table th, .sale-line-table td {
                    padding: 8px 12px;
                    text-align: left;
                    font-size: 0.85rem;
                    color: var(--text-primary);
                    border-bottom: 1px solid var(--border-color);
                }
                .sale-line-table th {
                    color: var(--text-secondary);
                    font-weight: 600;
                }
                .sale-line-table tr:last-child td {
                    border-bottom: none;
                }
                .profit-positive {
                    color: var(--accent-success);
                    font-weight: 600;
                }
                .profit-negative {
                    color: var(--accent-danger);
                    font-weight: 600;
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
                    .sale-line-items {
                        padding: 8px 8px 12px 24px;
                    }
                }
            `}</style>
        </section>
    );
}
