import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { pointsAPI } from '../services/api';

function TransactionsPage() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [typeFilter, setTypeFilter] = useState('');

  useEffect(() => {
    loadTransactions();
  }, [page, typeFilter]);

  const loadTransactions = async () => {
    try {
      const params = { page, limit: 25 };
      if (typeFilter) params.type = typeFilter;
      const { data } = await pointsAPI.getTransactions(params);
      setTransactions(data.transactions);
      setPagination(data.pagination);
    } catch (err) {
      toast.error('فشل في تحميل المعاملات');
    }
    setLoading(false);
  };

  const formatNumber = (num) => new Intl.NumberFormat('ar-SA').format(num);

  const transactionTypes = [
    { value: '', label: 'الكل' },
    { value: 'EARN_PURCHASE', label: 'شراء' },
    { value: 'EARN_SIGNUP', label: 'تسجيل' },
    { value: 'EARN_REFERRAL', label: 'إحالة' },
    { value: 'EARN_BONUS', label: 'مكافأة' },
    { value: 'REDEEM_COUPON', label: 'استبدال' },
    { value: 'DEDUCT_MANUAL', label: 'خصم يدوي' },
    { value: 'EXPIRED', label: 'منتهي' },
  ];

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1>📋 سجل المعاملات</h1>
        <p>جميع عمليات النقاط</p>
      </div>

      {/* الفلاتر */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-body" style={{ padding: '16px 24px' }}>
          <div className="tabs">
            {transactionTypes.map((type) => (
              <button
                key={type.value}
                className={`tab ${typeFilter === type.value ? 'active' : ''}`}
                onClick={() => { setTypeFilter(type.value); setPage(1); }}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* الجدول */}
      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>العميل</th>
                <th>النوع</th>
                <th>النقاط</th>
                <th>الوصف</th>
                <th>رقم الطلب</th>
                <th>التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>
                    لا توجد معاملات
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td><strong>{tx.customer?.name || '-'}</strong></td>
                    <td>
                      <span className={`badge ${getTypeBadge(tx.type)}`}>
                        {getTypeLabel(tx.type)}
                      </span>
                    </td>
                    <td>
                      <span className={`points-amount ${tx.points > 0 ? 'positive' : 'negative'}`}>
                        {tx.points > 0 ? '+' : ''}{formatNumber(tx.points)}
                      </span>
                    </td>
                    <td>{tx.description}</td>
                    <td>{tx.orderId || '-'}</td>
                    <td>
                      {new Date(tx.createdAt).toLocaleDateString('ar-SA', {
                        year: 'numeric', month: 'short', day: 'numeric',
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pagination && pagination.pages > 1 && (
          <div className="card-body" style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
            <button className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              السابق
            </button>
            <span style={{ padding: '6px 12px', fontSize: '14px' }}>
              صفحة {page} من {pagination.pages} ({formatNumber(pagination.total)} معاملة)
            </span>
            <button className="btn btn-outline btn-sm" disabled={page >= pagination.pages} onClick={() => setPage(p => p + 1)}>
              التالي
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function getTypeLabel(type) {
  const labels = {
    EARN_PURCHASE: '🛍️ شراء',
    EARN_SIGNUP: '👤 تسجيل',
    EARN_REFERRAL: '🤝 إحالة',
    EARN_BONUS: '🎁 مكافأة',
    REDEEM_COUPON: '🎟️ استبدال',
    DEDUCT_MANUAL: '➖ خصم',
    EXPIRED: '⏰ منتهي',
  };
  return labels[type] || type;
}

function getTypeBadge(type) {
  if (type.startsWith('EARN')) return 'badge-success';
  if (type === 'REDEEM_COUPON') return 'badge-warning';
  if (type === 'DEDUCT_MANUAL') return 'badge-danger';
  if (type === 'EXPIRED') return 'badge-info';
  return 'badge-primary';
}

export default TransactionsPage;
