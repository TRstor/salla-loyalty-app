import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { tiersAPI } from '../services/api';

function TiersPage() {
  const [tiers, setTiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTier, setEditingTier] = useState(null);
  const [form, setForm] = useState({
    name: '', nameAr: '', minPoints: '', multiplier: '1', color: '#CD7F32', sortOrder: '0',
  });

  useEffect(() => {
    loadTiers();
  }, []);

  const loadTiers = async () => {
    try {
      const { data } = await tiersAPI.getAll();
      setTiers(data.tiers);
    } catch (err) {
      toast.error('فشل في تحميل المستويات');
    }
    setLoading(false);
  };

  const handleSave = async () => {
    try {
      if (!form.name || !form.nameAr || !form.minPoints) {
        toast.error('يرجى ملء جميع الحقول المطلوبة');
        return;
      }

      if (editingTier) {
        await tiersAPI.update(editingTier.id, form);
        toast.success('تم تحديث المستوى');
      } else {
        await tiersAPI.create(form);
        toast.success('تم إضافة المستوى');
      }

      setShowForm(false);
      setEditingTier(null);
      resetForm();
      loadTiers();
    } catch (err) {
      toast.error('فشل في حفظ المستوى');
    }
  };

  const handleEdit = (tier) => {
    setEditingTier(tier);
    setForm({
      name: tier.name,
      nameAr: tier.nameAr,
      minPoints: String(tier.minPoints),
      multiplier: String(tier.multiplier),
      color: tier.color,
      sortOrder: String(tier.sortOrder),
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('هل أنت متأكد من حذف هذا المستوى؟')) {
      try {
        await tiersAPI.delete(id);
        toast.success('تم حذف المستوى');
        loadTiers();
      } catch (err) {
        toast.error('فشل في حذف المستوى');
      }
    }
  };

  const resetForm = () => {
    setForm({ name: '', nameAr: '', minPoints: '', multiplier: '1', color: '#CD7F32', sortOrder: '0' });
  };

  const formatNumber = (num) => new Intl.NumberFormat('ar-SA').format(num);

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>🏆 المستويات</h1>
          <p>إدارة مستويات العملاء في برنامج الولاء</p>
        </div>
        <button className="btn btn-primary" onClick={() => { resetForm(); setEditingTier(null); setShowForm(true); }}>
          + إضافة مستوى
        </button>
      </div>

      {/* بطاقات المستويات */}
      <div className="stats-grid">
        {tiers.map((tier) => (
          <div key={tier.id} className="card" style={{ borderTop: `4px solid ${tier.color}` }}>
            <div className="card-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '20px', marginBottom: '4px' }}>{tier.nameAr}</h3>
                  <span style={{ fontSize: '13px', color: '#64748b' }}>{tier.name}</span>
                </div>
                <div
                  style={{
                    width: '40px', height: '40px', borderRadius: '50%',
                    backgroundColor: tier.color, display: 'flex',
                    alignItems: 'center', justifyContent: 'center', fontSize: '18px',
                  }}
                >
                  ⭐
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: '#64748b', fontSize: '13px' }}>الحد الأدنى</span>
                  <strong>{formatNumber(tier.minPoints)} نقطة</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: '#64748b', fontSize: '13px' }}>مضاعف النقاط</span>
                  <strong>×{tier.multiplier}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b', fontSize: '13px' }}>عدد العملاء</span>
                  <strong>{tier._count?.customers || 0}</strong>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-outline btn-sm" style={{ flex: 1 }} onClick={() => handleEdit(tier)}>
                  تعديل
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(tier.id)}>
                  حذف
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {tiers.length === 0 && (
        <div className="card">
          <div className="empty-state">
            <p>لا توجد مستويات. أضف مستويات لتحفيز العملاء!</p>
          </div>
        </div>
      )}

      {/* نافذة إضافة/تعديل مستوى */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingTier ? 'تعديل مستوى' : 'إضافة مستوى جديد'}</h3>
              <button className="modal-close" onClick={() => setShowForm(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>الاسم بالإنجليزي *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="مثال: Diamond"
                />
              </div>
              <div className="form-group">
                <label>الاسم بالعربي *</label>
                <input
                  type="text"
                  value={form.nameAr}
                  onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
                  placeholder="مثال: ماسي"
                />
              </div>
              <div className="form-group">
                <label>الحد الأدنى من النقاط *</label>
                <input
                  type="number"
                  min="0"
                  value={form.minPoints}
                  onChange={(e) => setForm({ ...form, minPoints: e.target.value })}
                  placeholder="مثال: 10000"
                />
              </div>
              <div className="form-group">
                <label>مضاعف النقاط</label>
                <input
                  type="number"
                  min="1"
                  step="0.1"
                  value={form.multiplier}
                  onChange={(e) => setForm({ ...form, multiplier: e.target.value })}
                />
                <div className="hint">مثال: 2 = يحصل العميل على ضعف النقاط</div>
              </div>
              <div className="form-group">
                <label>اللون</label>
                <input
                  type="color"
                  value={form.color}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                  style={{ width: '60px', height: '40px', padding: '2px' }}
                />
              </div>
              <div className="form-group">
                <label>ترتيب العرض</label>
                <input
                  type="number"
                  min="0"
                  value={form.sortOrder}
                  onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={handleSave}>
                {editingTier ? 'تحديث' : 'إضافة'}
              </button>
              <button className="btn btn-outline" onClick={() => setShowForm(false)}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TiersPage;
