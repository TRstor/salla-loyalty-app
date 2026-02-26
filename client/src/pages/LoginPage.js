import React from 'react';
import { authAPI } from '../services/api';

function LoginPage() {
  const handleLogin = () => {
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

        <button className="btn btn-primary btn-lg" onClick={handleLogin}>
          🔗 ربط متجر سلة
        </button>
        
        <p style={{ marginTop: '16px', fontSize: '12px', color: '#94a3b8' }}>
          بالضغط ستتم إعادة توجيهك لصفحة تسجيل الدخول في سلة
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
