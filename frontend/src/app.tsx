import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { Dashboard } from '@/pages/Dashboard';
import { VaultManagement } from '@/pages/VaultManagement';
import { TransactionProcessing } from '@/pages/TransactionProcessing';
import { SignatureManagement } from '@/pages/SignatureManagement';
import { Analytics } from '@/pages/Analytics';
import { store } from '@/store';
import { AuthProvider } from '@/services/auth';

const App: React.FC = () => {
  return (
    <Provider store={store}>
      <AuthProvider>
        <BrowserRouter>
          <div className="app-container">
            <Header />
            <div className="main-content">
              <Sidebar />
              <div className="page-content">
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/vault-management" element={<VaultManagement />} />
                  <Route path="/transaction-processing" element={<TransactionProcessing />} />
                  <Route path="/signature-management" element={<SignatureManagement />} />
                  <Route path="/analytics" element={<Analytics />} />
                </Routes>
              </div>
            </div>
          </div>
        </BrowserRouter>
      </AuthProvider>
    </Provider>
  );
};

export default App;