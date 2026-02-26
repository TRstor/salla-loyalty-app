import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { customerSelfAPI, pointsAPI, couponsAPI } from '../services/api';

function CustomerPortal() {
  const { merchantId } = useParams();
  const [customer, setCustomer] = useState(null);
  const [history, setHistory] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [referral, setReferral] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [redeemPoints, setRedeemPoints] = useState('');
  const [redeeming, setRedeeming] = useState(false);

  useEffect(() => {
    // التحقق من وجود توكن العميل
    const token = localStorage.getItem('customer_token');
    if (token) {
      localStorage.setItem('token', token);
      loadCustomerData();
    } else {
      setLoading(false);
    }
  }, []);

  const loadCustomerData = async () => {
    try {
      const [profileRes, historyRes, couponsRes, referralRes] = await Promise.all([
        customerSelfAPI.getProfile(),
        pointsAPI.getMyHistory({ limit: 50 }),
        couponsAPI.getMyCoupons(),
        customerSelfAPI.getReferral(),
      ]);
      setCustomer(profileRes.data.customer);
      setHistory(historyRes.data.transactions);
      setCoupons(couponsRes.data.coupons);
      setReferral(referralRes.data);
    } catch (err) {
      console.error('Error loading customer data:', err);
      localStorage.removeItem('customer_token');
      localStorage.removeItem('token');
    }
    setLoading(false);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    try {
      const { data } = await customerSelfAPI.auth({
        merchantId,
        sallaCustomerId: formData.get('customerId'),
      });
      localStorage.setItem('customer_token', data.token);
      localStorage.setItem('token', data.token);
      loadCustomerData();
    } catch (err) {
      toast.error('لم يتم العثور على حسابك. تأكد من رقم العميل.');
    }
  };

  const handleRedeem = async () => {
    const points = parseInt(redeemPoints);
    if (!points || points <= 0) {
      toast.error('أدخل عدد نقاط صحيح');
      return;
    }

    setRedeeming(true);
    try {
      const { data } = await couponsAPI.redeem({ points });
      toast.success(`🎉 تم إنشاء كوبون بقيمة ${data.coupon.discountAmount} ر.س`);
      setRedeemPoints('');
      loadCustomerData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'فشل في استبدال النقاط');
    }
    setRedeeming(false);
  };

  const copyReferralCode = () => {
    if (referral?.referralCode) {
      navigator.clipboard.writeText(referral.referralCode);
      toast.success('تم نسخ كود الإحالة ✅');
    }
  };

  const formatNumber = (num) => new Intl.NumberFormat('ar-SA').format(num);

  if (loading) {
    return (
      <div className="customer-page">
        <div className="loading"><div className="spinner"></div></div>
      </div>
    );
  }

  // صفحة تسجيل دخول العميل
  if (!customer) {
    return (
      <div className="customer-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: '400px' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>⭐</div>
            <h2>نقاط الولاء</h2>
            <p style={{ color: '#64748b' }}>أدخل رقم العميل الخاص بك لعرض رصيدك</p>
          </div>
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>رقم العميل في سلة</label>
              <input
                type="text"
                name="customerId"
                placeholder="أدخل رقم العميل"
                required
                style={{ textAlign: 'center', fontSize: '18px' }}
              />
            </div>
            <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', justifyContent: 'center' }}>
              عرض نقاطي
            </button>
          </form>
        </div>
      </div>
    );
  }

  const settings = customer.merchant?.settings;
  const nextTier = customer.nextTier;
  const progressPercent = nextTier
    ? Math.min(100, ((customer.totalPoints - (customer.tier?.minPoints || 0)) / (nextTier.minPoints - (customer.tier?.minPoints || 0))) * 100)
    : 100;

  return (
    <div className="customer-page">
      {/* الهيدر */}
      <div className="customer-header">
        <div className="store-name">{customer.merchant?.storeName}</div>
        <h3 style={{ marginBottom: '4px' }}>أهلاً {customer.name} 👋</h3>
        {customer.tier && (
          <span className="tier-badge" style={{ backgroundColor: customer.tier.color, margin: '8px auto' }}>
            {customer.tier.nameAr}
          </span>
        )}
        <div className="points-display">{formatNumber(customer.currentPoints)}</div>
        <div className="points-label">نقطة متاحة</div>
      </div>

      {/* التقدم نحو المستوى التالي */}
      {nextTier && (
        <div className="tier-progress">
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
            <span>{customer.tier?.nameAr || 'بدون مستوى'}</span>
            <span>{nextTier.nameAr}</span>
          </div>
          <div className="progress-bar-container">
            <div className="progress-bar" style={{ width: `${progressPercent}%` }}></div>
          </div>
          <div style={{ textAlign: 'center', fontSize: '13px', color: '#64748b' }}>
            تحتاج {formatNumber(customer.pointsToNextTier)} نقطة للمستوى التالي
          </div>
        </div>
      )}

      {/* التبويبات */}
      <div className="tabs" style={{ justifyContent: 'center', marginBottom: '20px' }}>
        <button className={`tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
          نظرة عامة
        </button>
        <button className={`tab ${activeTab === 'redeem' ? 'active' : ''}`} onClick={() => setActiveTab('redeem')}>
          استبدال
        </button>
        <button className={`tab ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
          السجل
        </button>
        <button className={`tab ${activeTab === 'referral' ? 'active' : ''}`} onClick={() => setActiveTab('referral')}>
          الإحالة
        </button>
      </div>

      {/* المحتوى */}
      {activeTab === 'overview' && (
        <div>
          {/* إحصائيات سريعة */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
            <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: '700', color: '#6366f1' }}>{formatNumber(customer.currentPoints)}</div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>متاح</div>
            </div>
            <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: '700', color: '#10b981' }}>{formatNumber(customer.totalPoints)}</div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>مكتسب</div>
            </div>
            <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: '700', color: '#f59e0b' }}>{formatNumber(customer.usedPoints)}</div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>مستخدم</div>
            </div>
          </div>

          {/* كيف تكسب النقاط */}
          <div className="card" style={{ marginBottom: '20px' }}>
            <div className="card-body">
              <h4 style={{ marginBottom: '16px' }}>📌 كيف تكسب النقاط؟</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '24px' }}>🛍️</span>
                  <div>
                    <strong>كل عملية شراء</strong>
                    <div style={{ fontSize: '13px', color: '#64748b' }}>
                      احصل على {settings?.pointsPerRiyal || 1} نقطة لكل ريال
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '24px' }}>🤝</span>
                  <div>
                    <strong>إحالة صديق</strong>
                    <div style={{ fontSize: '13px', color: '#64748b' }}>
                      احصل على {settings?.referralBonus || 100} نقطة لكل إحالة
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '24px' }}>🔄</span>
                  <div>
                    <strong>استبدل نقاطك</strong>
                    <div style={{ fontSize: '13px', color: '#64748b' }}>
                      كل {settings?.pointsPerDiscount || 100} نقطة = 1 ر.س خصم
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* آخر المعاملات */}
          <div className="card">
            <div className="card-header">
              <h4>آخر المعاملات</h4>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              {history.slice(0, 5).map((tx) => (
                <div key={tx.id} className="points-history-item" style={{ padding: '14px 24px' }}>
                  <div>
                    <div style={{ fontWeight: '500', fontSize: '14px' }}>{tx.description}</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      {new Date(tx.createdAt).toLocaleDateString('ar-SA')}
                    </div>
                  </div>
                  <span className={`points-amount ${tx.points > 0 ? 'positive' : 'negative'}`}>
                    {tx.points > 0 ? '+' : ''}{formatNumber(tx.points)}
                  </span>
                </div>
              ))}
              {history.length === 0 && (
                <div className="empty-state"><p>لا توجد معاملات بعد</p></div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'redeem' && (
        <div>
          {/* استبدال النقاط */}
          <div className="card" style={{ marginBottom: '20px' }}>
            <div className="card-body" style={{ textAlign: 'center' }}>
              <h3 style={{ marginBottom: '8px' }}>🔄 استبدال النقاط بكوبون خصم</h3>
              <p style={{ color: '#64748b', marginBottom: '20px' }}>
                كل {settings?.pointsPerDiscount || 100} نقطة = 1 ر.س خصم | الحد الأدنى: {settings?.minRedeemPoints || 100} نقطة
              </p>
              
              <div className="form-group" style={{ maxWidth: '300px', margin: '0 auto' }}>
                <input
                  type="number"
                  min={settings?.minRedeemPoints || 100}
                  max={customer.currentPoints}
                  value={redeemPoints}
                  onChange={(e) => setRedeemPoints(e.target.value)}
                  placeholder={`أدخل عدد النقاط (${settings?.minRedeemPoints || 100} - ${customer.currentPoints})`}
                  style={{ textAlign: 'center', fontSize: '18px' }}
                />
                {redeemPoints && parseInt(redeemPoints) > 0 && (
                  <div style={{ marginTop: '12px', fontSize: '18px', fontWeight: '700', color: '#10b981' }}>
                    = {(parseInt(redeemPoints) / (settings?.pointsPerDiscount || 100)).toFixed(2)} ر.س خصم
                  </div>
                )}
              </div>
              
              <button
                className="btn btn-primary btn-lg"
                onClick={handleRedeem}
                disabled={redeeming || !redeemPoints || parseInt(redeemPoints) < (settings?.minRedeemPoints || 100)}
                style={{ marginTop: '16px' }}
              >
                {redeeming ? 'جارٍ الاستبدال...' : '🎟️ استبدال بكوبون'}
              </button>
            </div>
          </div>

          {/* الكوبونات */}
          <div className="card">
            <div className="card-header">
              <h4>🎟️ كوبوناتي</h4>
            </div>
            <div className="card-body">
              {coupons.length > 0 ? (
                coupons.map((coupon) => (
                  <div key={coupon.id} className={`coupon-card ${coupon.isUsed ? 'used' : ''}`}>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>كوبون خصم</div>
                    <div className="coupon-value">{coupon.discountAmount} ر.س</div>
                    <div className="coupon-code">{coupon.code}</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      {coupon.isUsed ? '✅ تم استخدامه' : `ينتهي: ${new Date(coupon.expiresAt).toLocaleDateString('ar-SA')}`}
                    </div>
                    {!coupon.isUsed && (
                      <button
                        className="btn btn-outline btn-sm"
                        style={{ marginTop: '8px' }}
                        onClick={() => {
                          navigator.clipboard.writeText(coupon.code);
                          toast.success('تم نسخ الكود ✅');
                        }}
                      >
                        📋 نسخ الكود
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <div className="empty-state"><p>لا توجد كوبونات بعد</p></div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="card">
          <div className="card-header">
            <h4>📋 سجل النقاط الكامل</h4>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {history.length > 0 ? (
              history.map((tx) => (
                <div key={tx.id} className="points-history-item" style={{ padding: '14px 24px' }}>
                  <div>
                    <div style={{ fontWeight: '500', fontSize: '14px' }}>{tx.description}</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      {new Date(tx.createdAt).toLocaleDateString('ar-SA', {
                        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
                      })}
                    </div>
                  </div>
                  <span className={`points-amount ${tx.points > 0 ? 'positive' : 'negative'}`}>
                    {tx.points > 0 ? '+' : ''}{formatNumber(tx.points)}
                  </span>
                </div>
              ))
            ) : (
              <div className="empty-state"><p>لا توجد معاملات بعد</p></div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'referral' && (
        <div>
          {/* كود الإحالة */}
          <div className="referral-box">
            <h3 style={{ marginBottom: '8px' }}>🤝 ادعُ أصدقاءك واكسب نقاط!</h3>
            <p style={{ opacity: 0.8, fontSize: '14px' }}>
              شارك كود الإحالة واحصل على {settings?.referralBonus || 100} نقطة لكل صديق يسجل
            </p>
            <div className="referral-code" onClick={copyReferralCode}>
              {referral?.referralCode || '---'}
            </div>
            <button
              className="btn"
              onClick={copyReferralCode}
              style={{ background: 'rgba(255,255,255,0.2)', color: 'white', marginTop: '8px' }}
            >
              📋 نسخ الكود
            </button>
          </div>

          <div className="card">
            <div className="card-body" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '36px', fontWeight: '700', color: '#6366f1' }}>
                {referral?.totalReferrals || 0}
              </div>
              <div style={{ color: '#64748b' }}>إحالة ناجحة</div>
            </div>
          </div>
        </div>
      )}

      {/* تسجيل الخروج */}
      <div style={{ textAlign: 'center', marginTop: '32px', paddingBottom: '32px' }}>
        <button
          className="btn btn-outline btn-sm"
          onClick={() => {
            localStorage.removeItem('customer_token');
            localStorage.removeItem('token');
            setCustomer(null);
          }}
        >
          تسجيل الخروج
        </button>
      </div>
    </div>
  );
}

export default CustomerPortal;
