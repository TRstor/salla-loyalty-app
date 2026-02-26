import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';

function DashboardLayout({ merchant, onLogout }) {
  return (
    <div className="app-layout">
      {/* الشريط الجانبي */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>⭐ نقاط الولاء</h2>
          <p>{merchant.storeName}</p>
        </div>
        <ul className="sidebar-nav">
          <li>
            <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'active' : ''}>
              <span className="nav-icon">📊</span>
              لوحة التحكم
            </NavLink>
          </li>
          <li>
            <NavLink to="/customers" className={({ isActive }) => isActive ? 'active' : ''}>
              <span className="nav-icon">👥</span>
              العملاء
            </NavLink>
          </li>
          <li>
            <NavLink to="/transactions" className={({ isActive }) => isActive ? 'active' : ''}>
              <span className="nav-icon">📋</span>
              سجل المعاملات
            </NavLink>
          </li>
          <li>
            <NavLink to="/coupons" className={({ isActive }) => isActive ? 'active' : ''}>
              <span className="nav-icon">🎟️</span>
              الكوبونات
            </NavLink>
          </li>
          <li>
            <NavLink to="/tiers" className={({ isActive }) => isActive ? 'active' : ''}>
              <span className="nav-icon">🏆</span>
              المستويات
            </NavLink>
          </li>
          <li>
            <NavLink to="/settings" className={({ isActive }) => isActive ? 'active' : ''}>
              <span className="nav-icon">⚙️</span>
              الإعدادات
            </NavLink>
          </li>
          <li style={{ marginTop: '24px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '12px' }}>
            <button onClick={onLogout}>
              <span className="nav-icon">🚪</span>
              تسجيل الخروج
            </button>
          </li>
        </ul>
      </aside>

      {/* المحتوى الرئيسي */}
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}

export default DashboardLayout;
