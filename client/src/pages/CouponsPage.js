import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { couponsAPI } from '../services/api';

function CouponsPage() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  useEffect(() => {
    loadCoupons();
  }, [page]);

  const loadCoupons = async () => {
    try {
      const { data } = await couponsAPI.getAll({ page, limit: 20 });
      setCoupons(data.coupons);
      setPagination(data.pagination);
    } catch (err) {
      toast.error('فشل في تحميل الكوبونات');
    }
    setLoading(false);
  };

  const formatNumber = (num) => new Intl.NumberFormat('ar-SA').format(num);

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1>🎟️ الكوبونات</h1>
        <p>كوبونات الخصم المُنشأة من نقاط الولاء</p>
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>الكود</th>
                <th>العميل</th>
                <th>قيمة الخصم</th>
                <th>النقاط المستخدمة</th>
                <th>الحالة</th>
                <th>تاريخ الإنشاء</th>
                <th>تاريخ الانتهاء</th>
              </tr>
            </thead>
            <tbody>
              {coupons.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '40px' }}>
                    لا توجد كوبونات بعد
                  </td>
                </tr>
              ) : (
                coupons.map((coupon) => (
                  <tr key={coupon.id}>
                    <td>
                      <code style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px', fontSize: '13px' }}>
                        {coupon.code}
                      </code>
                    </td>
                    <td>{coupon.customer?.name || '-'}</td>
                    <td>
                      <strong style={{ color: '#10b981' }}>
                        {coupon.discountAmount} ر.س
                      </strong>
                    </td>
                    <td>{formatNumber(coupon.pointsUsed)} نقطة</td>
                    <td>
                      {coupon.isUsed ? (
                        <span className="badge badge-success">مستخدم</span>
                      ) : new Date(coupon.expiresAt) < new Date() ? (
                        <span className="badge badge-danger">منتهي</span>
                      ) : (
                        <span className="badge badge-warning">نشط</span>
                      )}
                    </td>
                    <td>{new Date(coupon.createdAt).toLocaleDateString('ar-SA')}</td>
                    <td>{new Date(coupon.expiresAt).toLocaleDateString('ar-SA')}</td>
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
              صفحة {page} من {pagination.pages}
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

export default CouponsPage;
