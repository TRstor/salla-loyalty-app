const express = require('express');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const prisma = require('../config/database');
const SallaService = require('../services/sallaService');

const router = express.Router();

// === النمط السهل: الدخول للوحة التحكم عبر Store ID ===
// بعد تثبيت التطبيق من سلة، التوكن يوصل عبر webhook
// التاجر يدخل للوحة التحكم من هذا الرابط

router.get('/login', async (req, res) => {
  const { store_id } = req.query;
  
  if (store_id) {
    // النمط السهل: البحث عن التاجر بالـ store ID
    try {
      const merchant = await prisma.merchant.findUnique({
        where: { sallaStoreId: String(store_id) },
      });

      if (merchant && merchant.isActive) {
        const token = jwt.sign(
          { merchantId: merchant.id, storeId: merchant.sallaStoreId },
          config.jwt.secret,
          { expiresIn: config.jwt.expiresIn }
        );
        return res.redirect(`${config.clientUrl}/dashboard?token=${token}`);
      }
    } catch (error) {
      console.error('Login by store_id error:', error);
    }
  }

  // Fallback: نمط مخصص (redirect OAuth)
  const state = uuidv4();
  req.session.oauthState = state;
  const authUrl = SallaService.getAuthUrl(state);
  res.redirect(authUrl);
});

// Callback من سلة بعد الموافقة (نمط مخصص - fallback)
router.get('/callback', async (req, res) => {
  try {
    const { code, state } = req.query;

    // التحقق من state (حماية CSRF)
    if (state && req.session.oauthState && state !== req.session.oauthState) {
      return res.status(400).json({ success: false, message: 'Invalid state parameter' });
    }

    // استبدال الكود بتوكن
    const tokenData = await SallaService.exchangeCode(code);
    const { access_token, refresh_token, expires_in } = tokenData;

    // جلب معلومات المتجر
    const sallaService = new SallaService(access_token);
    const storeInfo = await sallaService.getStoreInfo();

    // حفظ أو تحديث التاجر
    const merchant = await prisma.merchant.upsert({
      where: { sallaStoreId: String(storeInfo.id) },
      update: {
        storeName: storeInfo.name,
        email: storeInfo.email,
        accessToken: access_token,
        refreshToken: refresh_token,
        tokenExpiresAt: new Date(Date.now() + expires_in * 1000),
      },
      create: {
        sallaStoreId: String(storeInfo.id),
        storeName: storeInfo.name,
        email: storeInfo.email,
        accessToken: access_token,
        refreshToken: refresh_token,
        tokenExpiresAt: new Date(Date.now() + expires_in * 1000),
        settings: {
          create: {},
        },
        tiers: {
          createMany: {
            data: [
              { name: 'Bronze', nameAr: 'برونزي', minPoints: 0, multiplier: 1, color: '#CD7F32', sortOrder: 1 },
              { name: 'Silver', nameAr: 'فضي', minPoints: 500, multiplier: 1.5, color: '#C0C0C0', sortOrder: 2 },
              { name: 'Gold', nameAr: 'ذهبي', minPoints: 2000, multiplier: 2, color: '#FFD700', sortOrder: 3 },
              { name: 'Platinum', nameAr: 'بلاتيني', minPoints: 5000, multiplier: 3, color: '#E5E4E2', sortOrder: 4 },
            ],
          },
        },
      },
    });

    // إنشاء JWT
    const token = jwt.sign(
      { merchantId: merchant.id, storeId: merchant.sallaStoreId },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    res.redirect(`${config.clientUrl}/dashboard?token=${token}`);
  } catch (error) {
    console.error('OAuth Callback Error:', error);
    res.redirect(`${config.clientUrl}/error?message=${encodeURIComponent('فشل في تسجيل الدخول')}`);
  }
});

// الدخول عبر Store ID (API endpoint)
router.post('/login-by-store', async (req, res) => {
  try {
    const { storeId } = req.body;

    if (!storeId) {
      return res.status(400).json({ success: false, message: 'Store ID مطلوب' });
    }

    const merchant = await prisma.merchant.findUnique({
      where: { sallaStoreId: String(storeId) },
    });

    if (!merchant || !merchant.isActive) {
      return res.status(404).json({ success: false, message: 'المتجر غير مسجل. يرجى تثبيت التطبيق من سلة أولاً' });
    }

    const token = jwt.sign(
      { merchantId: merchant.id, storeId: merchant.sallaStoreId },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    res.json({ success: true, token, merchant: { id: merchant.id, storeName: merchant.storeName } });
  } catch (error) {
    console.error('Login by store error:', error);
    res.status(500).json({ success: false, message: 'فشل في تسجيل الدخول' });
  }
});

// تحديث التوكن
router.post('/refresh', async (req, res) => {
  try {
    const { merchantId } = req.body;
    const merchant = await prisma.merchant.findUnique({ where: { id: merchantId } });
    
    if (!merchant || !merchant.refreshToken) {
      return res.status(400).json({ success: false, message: 'لا يمكن تحديث التوكن' });
    }

    const tokenData = await SallaService.refreshAccessToken(merchant.refreshToken);
    
    await prisma.merchant.update({
      where: { id: merchantId },
      data: {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        tokenExpiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
      },
    });

    res.json({ success: true, message: 'تم تحديث التوكن بنجاح' });
  } catch (error) {
    console.error('Token Refresh Error:', error);
    res.status(500).json({ success: false, message: 'فشل في تحديث التوكن' });
  }
});

// التحقق من التوكن
router.get('/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, message: 'لا يوجد توكن' });
    }

    const decoded = jwt.verify(token, config.jwt.secret);
    const merchant = await prisma.merchant.findUnique({
      where: { id: decoded.merchantId },
      select: { id: true, storeName: true, email: true, sallaStoreId: true, isActive: true },
    });

    if (!merchant) {
      return res.status(401).json({ success: false, message: 'تاجر غير موجود' });
    }

    res.json({ success: true, merchant });
  } catch (error) {
    res.status(401).json({ success: false, message: 'توكن غير صالح' });
  }
});

module.exports = router;
