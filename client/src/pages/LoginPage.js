import React, { useState } from 'react';
import { authAPI } from '../services/api';

function LoginPage() {
  const [storeId, setStoreId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLoginByStore = async (e) => {
    e.preventDefault();
    if (!storeId.trim()) return;
    
    setLoading(true);
    setError('');
    
    try {
      const { data } = await authAPI.loginByStore(storeId.trim());
      if (data.success && data.token) {
        localStorage.setItem('token', data.token);
        window.location.href = '/dashboard';
      }
    } catch (err) {
      setError(err.response?.data?.message || 'فشل في تسجيل الدخول');
    }
    setLoading(false);
  };

  const handleOAuthLogin = () => {
    window.location.href = authAPI.getLoginUrl();
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⭐</div>
        <h1>نظام نقاط الولاء</h1>
        <p>قم بربط متجرك على سلة وابدأ ببرنامج الولاء لعملائك</p>
        
        <div style={{ marginBottom: '24px', textAlign: 'right' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <span>✅</span>
            <span>نقاط تلقائية على كل عملية شراء</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <span>✅</span>
            <span>مستويات العملاء (برونزي، فضي، ذهبي)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <span>✅</span>
            <span>استبدال النقاط بكوبونات خصم</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <span>✅</span>
            <span>نظام الإحالات والمكافآت</span>
          </div>
        </div>

        {/* تسجيل دخول عبر Store ID */}
        <form onSubmit={handleLoginByStore} style={{ marginBottom: '16px' }}>
          <input
            type="text"
            placeholder="أدخل رقم المتجر (Store ID)"
            value={storeId}
            onChange={(e) => setStoreId(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: '8px',
              border: '1px solid #334155',
              backgroundColor: '#1e293b',
              color: '#fff',
              fontSize: '14px',
              marginBottom: '12px',
              textAlign: 'center',
            }}
          />
          {error && <p style={{ color: '#ef4444', fontSize: '13px', marginBottom: '8px' }}>{error}</p>}
          <button 
            type="submit" 
            className="btn btn-primary btn-lg" 
            disabled={loading}
            style={{ width: '100%' }}
          >
            {loading ? '⏳ جاري الدخول...' : '🔗 دخول بمعرّف المتجر'}
          </button>
        </form>
        
        <div style={{ margin: '16px 0', color: '#64748b', fontSize: '13px' }}>أو</div>

        <button className="btn btn-lg" onClick={handleOAuthLogin} style={{ width: '100%', backgroundColor: '#334155', color: '#fff' }}>
          🔐 تسجيل دخول عبر سلة OAuth
        </button>
        
        <p style={{ marginTop: '16px', fontSize: '12px', color: '#94a3b8' }}>
          ثبّت التطبيق من سلة أولاً ثم سجّل دخول بمعرّف متجرك
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
