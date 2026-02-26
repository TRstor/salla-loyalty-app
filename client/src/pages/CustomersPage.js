import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { customersAPI, pointsAPI } from '../services/api';

function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [showAddPoints, setShowAddPoints] = useState(null);
  const [pointsForm, setPointsForm] = useState({ points: '', description: '' });

  useEffect(() => {
    loadCustomers();
  }, [page, search]);

  const loadCustomers = async () => {
    try {
      const { data } = await customersAPI.getAll({ page, search, limit: 20 });
      setCustomers(data.customers);
      setPagination(data.pagination);
    } catch (err) {
      toast.error('فشل في تحميل العملاء');
    }
    setLoading(false);
  };

  const handleAddPoints = async (customerId) => {
    try {
      if (!pointsForm.points || parseInt(pointsForm.points) <= 0) {
        toast.error('أدخل عدد نقاط صحيح');
        return;
      }
      await pointsAPI.addPoints({
        customerId,
        points: parseInt(pointsForm.points),
        description: pointsForm.description,
      });
      toast.success('تم إضافة النقاط بنجاح');
      setShowAddPoints(null);
      setPointsForm({ points: '', description: '' });
      loadCustomers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'فشل في إضافة النقاط');
    }
  };

  const formatNumber = (num) => new Intl.NumberFormat('ar-SA').format(num);

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1>👥 العملاء</h1>
        <p>إدارة عملاء برنامج الولاء</p>
      </div>

      {/* البحث */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-body" style={{ padding: '16px 24px' }}>
          <input
            type="text"
            placeholder="🔍 ابحث بالاسم أو البريد أو رقم الجوال..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{ border: 'none', fontSize: '15px', width: '100%', outline: 'none' }}
          />
        </div>
      </div>

      {/* جدول العملاء */}
      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>العميل</th>
                <th>المستوى</th>
                <th>الرصيد الحالي</th>
                <th>إجمالي النقاط</th>
                <th>المستخدمة</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {customers.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>
                    لا يوجد عملاء
                  </td>
                </tr>
              ) : (
                customers.map((customer) => (
                  <tr key={customer.id}>
                    <td>
                      <div>
                        <strong>{customer.name}</strong>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>
                          {customer.email || customer.phone || '-'}
                        </div>
                      </div>
                    </td>
                    <td>
                      {customer.tier ? (
                        <span
                          className="tier-badge"
                          style={{ backgroundColor: customer.tier.color }}
                        >
                          {customer.tier.nameAr}
                        </span>
                      ) : (
                        <span className="badge badge-info">بدون مستوى</span>
                      )}
                    </td>
                    <td>
                      <strong style={{ color: '#6366f1' }}>
                        {formatNumber(customer.currentPoints)}
                      </strong>
                    </td>
                    <td>{formatNumber(customer.totalPoints)}</td>
                    <td>{formatNumber(customer.usedPoints)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <Link to={`/customers/${customer.id}`} className="btn btn-outline btn-sm">
                          التفاصيل
                        </Link>
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => setShowAddPoints(customer.id)}
                        >
                          + نقاط
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* التصفح */}
        {pagination && pagination.pages > 1 && (
          <div className="card-body" style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
            <button
              className="btn btn-outline btn-sm"
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
            >
              السابق
            </button>
            <span style={{ padding: '6px 12px', fontSize: '14px' }}>
              صفحة {page} من {pagination.pages}
            </span>
            <button
              className="btn btn-outline btn-sm"
              disabled={page >= pagination.pages}
              onClick={() => setPage(p => p + 1)}
            >
              التالي
            </button>
          </div>
        )}
      </div>

      {/* نافذة إضافة نقاط */}
      {showAddPoints && (
        <div className="modal-overlay" onClick={() => setShowAddPoints(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>إضافة نقاط</h3>
              <button className="modal-close" onClick={() => setShowAddPoints(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>عدد النقاط</label>
                <input
                  type="number"
                  min="1"
                  value={pointsForm.points}
                  onChange={(e) => setPointsForm({ ...pointsForm, points: e.target.value })}
                  placeholder="أدخل عدد النقاط"
                />
              </div>
              <div className="form-group">
                <label>السبب (اختياري)</label>
                <input
                  type="text"
                  value={pointsForm.description}
                  onChange={(e) => setPointsForm({ ...pointsForm, description: e.target.value })}
                  placeholder="مثال: مكافأة خاصة"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => handleAddPoints(showAddPoints)}>
                إضافة النقاط
              </button>
              <button className="btn btn-outline" onClick={() => setShowAddPoints(null)}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CustomersPage;
