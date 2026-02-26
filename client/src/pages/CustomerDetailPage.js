import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { customersAPI, pointsAPI } from '../services/api';

function CustomerDetailPage() {
  const { id } = useParams();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCustomer();
  }, [id]);

  const loadCustomer = async () => {
    try {
      const { data } = await customersAPI.getOne(id);
      setCustomer(data.customer);
    } catch (err) {
      toast.error('فشل في تحميل بيانات العميل');
    }
    setLoading(false);
  };

  const formatNumber = (num) => new Intl.NumberFormat('ar-SA').format(num);

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  if (!customer) {
    return (
      <div className="empty-state">
        <p>العميل غير موجود</p>
        <Link to="/customers" className="btn btn-primary" style={{ marginTop: '16px' }}>
          العودة للعملاء
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Link to="/customers" style={{ color: '#6366f1', textDecoration: 'none', fontSize: '14px' }}>
            ← العودة للعملاء
          </Link>
          <h1 style={{ marginTop: '8px' }}>{customer.name}</h1>
          <p>{customer.email || ''} {customer.phone ? `| ${customer.phone}` : ''}</p>
        </div>
        {customer.tier && (
          <span className="tier-badge" style={{ backgroundColor: customer.tier.color, fontSize: '16px', padding: '8px 20px' }}>
            {customer.tier.nameAr}
          </span>
        )}
      </div>

      {/* بطاقات الإحصائيات */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon purple">
            <span style={{ fontSize: '24px' }}>⭐</span>
          </div>
          <div className="stat-info">
            <h4>الرصيد الحالي</h4>
            <div className="stat-value">{formatNumber(customer.currentPoints)}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon green">
            <span style={{ fontSize: '24px' }}>📈</span>
          </div>
          <div className="stat-info">
            <h4>إجمالي المكتسب</h4>
            <div className="stat-value">{formatNumber(customer.totalPoints)}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon orange">
            <span style={{ fontSize: '24px' }}>🔄</span>
          </div>
          <div className="stat-info">
            <h4>المستخدمة</h4>
            <div className="stat-value">{formatNumber(customer.usedPoints)}</div>
          </div>
        </div>
      </div>

      <div className="grid-2">
        {/* سجل المعاملات */}
        <div className="card">
          <div className="card-header">
            <h3>📋 سجل النقاط</h3>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {customer.transactions?.length > 0 ? (
              customer.transactions.map((tx) => (
                <div key={tx.id} className="points-history-item" style={{ padding: '14px 24px' }}>
                  <div>
                    <div style={{ fontWeight: '500' }}>{tx.description}</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      {new Date(tx.createdAt).toLocaleDateString('ar-SA', {
                        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </div>
                  </div>
                  <span className={`points-amount ${tx.points > 0 ? 'positive' : 'negative'}`}>
                    {tx.points > 0 ? '+' : ''}{formatNumber(tx.points)}
                  </span>
                </div>
              ))
            ) : (
              <div className="empty-state"><p>لا توجد معاملات</p></div>
            )}
          </div>
        </div>

        {/* الكوبونات */}
        <div className="card">
          <div className="card-header">
            <h3>🎟️ كوبونات العميل</h3>
          </div>
          <div className="card-body">
            {customer.coupons?.length > 0 ? (
              customer.coupons.map((coupon) => (
                <div key={coupon.id} className={`coupon-card ${coupon.isUsed ? 'used' : ''}`}>
                  <div className="coupon-code">{coupon.code}</div>
                  <div className="coupon-value">{coupon.discountAmount} ر.س</div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '8px' }}>
                    {coupon.isUsed ? '✅ مستخدم' : `ينتهي: ${new Date(coupon.expiresAt).toLocaleDateString('ar-SA')}`}
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state"><p>لا توجد كوبونات</p></div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CustomerDetailPage;
