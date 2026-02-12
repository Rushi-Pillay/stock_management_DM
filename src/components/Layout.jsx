import { Package, Camera, Search, ClipboardList, History } from 'lucide-react';

export default function Layout({ children, currentView, onViewChange }) {
    const navItems = [
        { id: 'scan', label: 'Scan', icon: Camera },
        { id: 'search', label: 'Search', icon: Search },
        { id: 'inventory', label: 'Inventory', icon: ClipboardList },
        { id: 'transactions', label: 'History', icon: History },
    ];

    return (
        <div className="app-container">
            <header className="app-header">
                <h1>
                    <Package className="header-icon" size={24} />
                    Stock Manager
                </h1>
            </header>

            <main className="main-content">
                {children}
            </main>

            <nav className="bottom-nav">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                        <button
                            key={item.id}
                            className={`nav-btn ${currentView === item.id ? 'active' : ''}`}
                            onClick={() => onViewChange(item.id)}
                        >
                            <Icon className="nav-icon" size={24} />
                            <span className="nav-label">{item.label}</span>
                        </button>
                    );
                })}
            </nav>
        </div>
    );
}
