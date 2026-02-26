import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { authAPI } from './services/api';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import CustomersPage from './pages/CustomersPage';
import CustomerDetailPage from './pages/CustomerDetailPage';
import SettingsPage from './pages/SettingsPage';
import TiersPage from './pages/TiersPage';
import TransactionsPage from './pages/TransactionsPage';
import CouponsPage from './pages/CouponsPage';
import CustomerPortal from './pages/CustomerPortal';

// Layout
import DashboardLayout from './components/layout/DashboardLayout';

function App() {
  const [merchant, setMerchant] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // التحقق من وجود توكن في URL (بعد OAuth)
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');
    if (urlToken) {
      localStorage.setItem('token', urlToken);
      window.history.replaceState({}, '', window.location.pathname);
    }

    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const { data } = await authAPI.verify();
      setMerchant(data.merchant);
    } catch (err) {
      localStorage.removeItem('token');
    }
    setLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setMerchant(null);
  };

  if (loading) {
    return (
      <div className="loading" style={{ minHeight: '100vh' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <>
      <Toaster
        position="top-left"
        toastOptions={{
          duration: 3000,
          style: { fontFamily: 'Tajawal', direction: 'rtl' },
        }}
      />
      <Routes>
        {/* صفحة العميل */}
        <Route path="/loyalty/:merchantId" element={<CustomerPortal />} />
        
        {/* لوحة التحكم */}
        {merchant ? (
          <Route element={<DashboardLayout merchant={merchant} onLogout={handleLogout} />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/customers/:id" element={<CustomerDetailPage />} />
            <Route path="/transactions" element={<TransactionsPage />} />
            <Route path="/coupons" element={<CouponsPage />} />
            <Route path="/tiers" element={<TiersPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        ) : (
          <>
            <Route path="/" element={<LoginPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        )}
      </Routes>
    </>
  );
}

export default App;
