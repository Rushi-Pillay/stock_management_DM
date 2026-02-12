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
import './index.css';

function MainApp() {
  const { isAuthenticated } = useAuth();
  const [currentView, setCurrentView] = useState('scan');

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <Layout currentView={currentView} onViewChange={setCurrentView}>
      {currentView === 'scan' && <ScanView />}
      {currentView === 'search' && <SearchView />}
      {currentView === 'inventory' && <InventoryView />}
      {currentView === 'transactions' && <TransactionsView />}
    </Layout>
  );
}

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <InventoryProvider>
          <ModalProvider>
            <MainApp />
          </ModalProvider>
        </InventoryProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
