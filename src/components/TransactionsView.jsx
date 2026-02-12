import { useInventory } from '../contexts/InventoryContext';
import { History, ArrowUpRight, ArrowDownRight, Edit, Trash2 } from 'lucide-react';

export default function TransactionsView() {
    const { transactions, loading } = useInventory();

    const getIcon = (type) => {
        switch (type) {
            case 'ADD_ITEM':
                return <ArrowUpRight className="text-green-500" size={20} />;
            case 'REMOVE_STOCK':
                return <ArrowDownRight className="text-orange-500" size={20} />;
            case 'UPDATE_ITEM':
                return <Edit className="text-blue-500" size={20} />;
            case 'DELETE_ITEM':
                return <Trash2 className="text-red-500" size={20} />;
            default:
                return <History className="text-gray-500" size={20} />;
        }
    };

    const formatTime = (isoString) => {
        return new Date(isoString).toLocaleString('en-ZA', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getDescription = (t) => {
        switch (t.type) {
            case 'ADD_ITEM':
                return `Added "${t.details.itemName}" (Qty: ${t.details.quantity})`;
            case 'REMOVE_STOCK':
                return `Removed ${t.details.quantityRemoved} from "${t.details.itemName}"`;
            case 'UPDATE_ITEM':
                return `Updated "${t.details.itemName}"`;
            case 'DELETE_ITEM':
                return `Deleted "${t.details.itemName}"`;
            default:
                return 'Unknown transaction';
        }
    };

    if (loading) {
        return <div className="p-4 text-center">Loading transactions...</div>;
    }

    return (
        <div className="view-container">
            <h2 className="view-title flex items-center gap-2">
                <History size={24} />
                Transaction History
            </h2>

            <div className="space-y-3">
                {transactions.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                        No transactions recorded yet.
                    </div>
                ) : (
                    transactions.map((t) => (
                        <div key={t.id} className="bg-white p-3 rounded-lg shadow-sm border border-gray-100 flex items-start gap-3">
                            <div className="mt-1 p-2 bg-gray-50 rounded-full">
                                {getIcon(t.type)}
                            </div>
                            <div className="flex-1">
                                <p className="font-medium text-gray-900">{getDescription(t)}</p>
                                <p className="text-sm text-gray-500 mt-1">
                                    {formatTime(t.timestamp)}
                                </p>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
