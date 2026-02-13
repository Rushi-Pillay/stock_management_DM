import { useState } from 'react';
import { ToastProvider } from './contexts/ToastContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { InventoryProvider } from './contexts/InventoryContext';
import { ModalProvider } from './contexts/ModalContext';
import Layout from './components/Layout';
import Login from './components/Login';
import ScanView from './components/ScanView';
import SearchView from './components/SearchView';
import InventoryView from './components/InventoryView';
import TransactionsView from './components/TransactionsView';
import UserManagementView from './components/UserManagementView';
import './index.css';


function MainApp() {
  const { isAuthenticated } = useAuth();
  const [currentView, setCurrentView] = useState('scan');
  // Default to desktop if width is large enough, otherwise mobile. Or default false as asked for a toggle.
  const [isDesktop, setIsDesktop] = useState(window.innerWidth > 768);

  const toggleViewMode = () => setIsDesktop(!isDesktop);

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <Layout
      currentView={currentView}
      onViewChange={setCurrentView}
      isDesktop={isDesktop}
      onToggleViewMode={toggleViewMode}
    >
      <div className={`mode-${isDesktop ? 'desktop' : 'mobile'}`}>
        {currentView === 'scan' && <ScanView isDesktop={isDesktop} />}
        {currentView === 'search' && <SearchView isDesktop={isDesktop} />}
        {currentView === 'inventory' && <InventoryView isDesktop={isDesktop} />}
        {currentView === 'transactions' && <TransactionsView isDesktop={isDesktop} />}
        {currentView === 'users' && <UserManagementView isDesktop={isDesktop} />}
      </div>
    </Layout>
  );
}

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <InventoryProvider>
          <ModalProvider>
            <div style={{ position: 'relative' }}>
              <MainApp />
            </div>
          </ModalProvider>
        </InventoryProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
