import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { settingsAPI } from '../services/api';

function SettingsPage() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data } = await settingsAPI.get();
      setSettings(data.settings);
    } catch (err) {
      toast.error('فشل في تحميل الإعدادات');
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await settingsAPI.update(settings);
      toast.success('تم حفظ الإعدادات بنجاح ✅');
    } catch (err) {
      toast.error('فشل في حفظ الإعدادات');
    }
    setSaving(false);
  };

  const handleChange = (field, value) => {
    setSettings({ ...settings, [field]: value });
  };

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  if (!settings) return null;

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>⚙️ الإعدادات</h1>
          <p>إعدادات برنامج نقاط الولاء</p>
        </div>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'جارٍ الحفظ...' : '💾 حفظ الإعدادات'}
        </button>
      </div>

      <div className="grid-2">
        {/* إعدادات عامة */}
        <div className="card">
          <div className="card-header">
            <h3>🎯 إعدادات عامة</h3>
          </div>
          <div className="card-body">
            <div className="form-group">
              <label>اسم البرنامج</label>
              <input
                type="text"
                value={settings.programName}
                onChange={(e) => handleChange('programName', e.target.value)}
              />
            </div>
            <div className="form-group" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ marginBottom: 0 }}>تفعيل البرنامج</label>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={settings.isEnabled}
                  onChange={(e) => handleChange('isEnabled', e.target.checked)}
                />
                <span className="switch-slider"></span>
              </label>
            </div>
          </div>
        </div>

        {/* إعدادات النقاط */}
        <div className="card">
          <div className="card-header">
            <h3>⭐ إعدادات النقاط</h3>
          </div>
          <div className="card-body">
            <div className="form-group">
              <label>عدد النقاط لكل ريال</label>
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={settings.pointsPerRiyal}
                onChange={(e) => handleChange('pointsPerRiyal', e.target.value)}
              />
              <div className="hint">مثال: 1 = نقطة واحدة لكل ريال يُنفقه العميل</div>
            </div>
            <div className="form-group">
              <label>الحد الأدنى لمبلغ الطلب (ر.س)</label>
              <input
                type="number"
                min="0"
                value={settings.minOrderAmount}
                onChange={(e) => handleChange('minOrderAmount', e.target.value)}
              />
              <div className="hint">الطلبات أقل من هذا المبلغ لن تحصل على نقاط</div>
            </div>
            <div className="form-group">
              <label>صلاحية النقاط (بالأيام)</label>
              <input
                type="number"
                min="1"
                value={settings.pointsExpiryDays}
                onChange={(e) => handleChange('pointsExpiryDays', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* إعدادات الاستبدال */}
        <div className="card">
          <div className="card-header">
            <h3>🔄 إعدادات الاستبدال</h3>
          </div>
          <div className="card-body">
            <div className="form-group">
              <label>عدد النقاط مقابل 1 ر.س خصم</label>
              <input
                type="number"
                min="1"
                value={settings.pointsPerDiscount}
                onChange={(e) => handleChange('pointsPerDiscount', e.target.value)}
              />
              <div className="hint">مثال: 100 = كل 100 نقطة تساوي 1 ر.س خصم</div>
            </div>
            <div className="form-group">
              <label>الحد الأدنى للاستبدال (نقاط)</label>
              <input
                type="number"
                min="1"
                value={settings.minRedeemPoints}
                onChange={(e) => handleChange('minRedeemPoints', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>أقصى نسبة خصم (%)</label>
              <input
                type="number"
                min="1"
                max="100"
                value={settings.maxDiscountPercent}
                onChange={(e) => handleChange('maxDiscountPercent', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* نقاط المكافآت */}
        <div className="card">
          <div className="card-header">
            <h3>🎁 نقاط المكافآت</h3>
          </div>
          <div className="card-body">
            <div className="form-group">
              <label>نقاط التسجيل الترحيبية</label>
              <input
                type="number"
                min="0"
                value={settings.signupBonus}
                onChange={(e) => handleChange('signupBonus', e.target.value)}
              />
              <div className="hint">نقاط يحصل عليها العميل عند التسجيل لأول مرة</div>
            </div>
            <div className="form-group">
              <label>نقاط الإحالة للمُحيل</label>
              <input
                type="number"
                min="0"
                value={settings.referralBonus}
                onChange={(e) => handleChange('referralBonus', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>نقاط الإحالة للمُحال إليه</label>
              <input
                type="number"
                min="0"
                value={settings.referredBonus}
                onChange={(e) => handleChange('referredBonus', e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;
