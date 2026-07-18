import { Package, Camera, ClipboardList, Users, LogOut, Smartphone, Monitor, Sun, Moon, ShoppingCart, TrendingUp, PackagePlus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useState, useEffect } from 'react';

export default function Layout({ children, currentView, onViewChange, isDesktop, onToggleViewMode }) {
    const { isAdmin, logout } = useAuth();

    // Theme state
    const [theme, setTheme] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('theme') || 'light';
        }
        return 'light';
    });

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    };

    const navItems = [
        { id: 'scan', label: 'Scan', icon: Camera },
        { id: 'pos', label: 'POS', icon: ShoppingCart },
        { id: 'intake', label: 'Stock In', icon: PackagePlus },
        { id: 'inventory', label: 'Inventory', icon: ClipboardList },
        { id: 'sales', label: 'Sales', icon: TrendingUp },
        { id: 'transactions', label: 'History', icon: Package },
    ];

    if (isAdmin) {
        navItems.push({ id: 'users', label: 'Users', icon: Users });
    }

    return (
        <div className="app-container">
            <header className="app-header">
                <h1>
                    <Package className="header-icon" size={24} />
                    Stock Manager
                </h1>
                <div className="header-actions">
                    <button onClick={toggleTheme} className="mode-toggle-btn" title={theme === 'light' ? "Switch to Dark Mode" : "Switch to Light Mode"}>
                        {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                    </button>
                    <button onClick={onToggleViewMode} className="mode-toggle-btn" title={isDesktop ? "Switch to Mobile" : "Switch to Desktop"}>
                        {isDesktop ? <Smartphone size={20} /> : <Monitor size={20} />}
                    </button>
                    <button onClick={logout} className="logout-btn" title="Sign Out">
                        <LogOut size={20} />
                    </button>
                </div>
            </header>

            <style>{`
                .logout-btn {
                    background: none;
                    border: none;
                    color: white;
                    cursor: pointer;
                    padding: 8px;
                    display: flex;
                    align-items: center;
                    opacity: 0.8;
                }
                .logout-btn:hover {
                    opacity: 1;
                }
                .app-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding-right: 1rem;
                }
                .header-actions {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }
                .mode-toggle-btn {
                    background: none;
                    border: none;
                    color: white;
                    cursor: pointer;
                    opacity: 0.8;
                    display: flex; /* Ensure alignment */
                }
                .mode-toggle-btn:hover {
                    opacity: 1;
                }
                .layout-body {
                    flex: 1;
                    display: flex;
                    overflow: hidden;
                    position: relative;
                }
                .layout-body.mobile-layout {
                    flex-direction: column;
                }
                .layout-body.desktop-layout {
                    flex-direction: row;
                }
                .sidebar {
                    width: 250px;
                    background: var(--bg-card);
                    border-right: 1px solid var(--border-color);
                    display: flex;
                    flex-direction: column;
                    padding-top: 1rem;
                }
                .desktop-nav {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }
                .desktop-nav-btn {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    padding: 0.75rem 1.5rem;
                    border: none;
                    background: none;
                    text-align: left;
                    font-size: 1rem;
                    color: var(--text-secondary);
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .desktop-nav-btn:hover {
                    background-color: var(--bg-elevated);
                    color: var(--accent-primary);
                }
                .desktop-nav-btn.active {
                    background-color: rgba(67, 56, 202, 0.1);
                    color: var(--accent-primary);
                    border-right: 3px solid var(--accent-primary);
                }
                .main-content {
                    flex: 1;
                    overflow-y: auto;
                    background-color: var(--bg-primary);
                    padding-bottom: 80px; /* Space for bottom nav in mobile */
                }
                .desktop-layout .main-content {
                    padding-bottom: 0; /* No bottom nav space needed */
                }
            `}</style>

            <div className={`layout-body ${isDesktop ? 'desktop-layout' : 'mobile-layout'}`}>
                {isDesktop && (
                    <aside className="sidebar">
                        <nav className="desktop-nav">
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                return (
                                    <button
                                        key={item.id}
                                        className={`desktop-nav-btn ${currentView === item.id ? 'active' : ''}`}
                                        onClick={() => onViewChange(item.id)}
                                    >
                                        <Icon className="nav-icon" size={20} />
                                        <span className="nav-label">{item.label}</span>
                                    </button>
                                );
                            })}
                        </nav>
                    </aside>
                )}
                <main className="main-content">
                    {children}
                </main>
            </div>

            {!isDesktop && (
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
            )}
        </div>
    );
}
