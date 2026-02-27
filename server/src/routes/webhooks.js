const express = require('express');
const jwt = require('jsonwebtoken');
const config = require('../config');
const prisma = require('../config/database');
const PointsService = require('../services/pointsService');
const SallaService = require('../services/sallaService');

const router = express.Router();

// التحقق من توكن Webhook (نمط Token)
const verifyWebhookToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.replace('Bearer ', '');
  
  if (!config.salla.webhookSecret) {
    // في بيئة التطوير، نتخطى التحقق
    if (config.nodeEnv === 'development') {
      return next();
    }
    return res.status(401).json({ message: 'Webhook secret not configured' });
  }

  if (!token || token !== config.salla.webhookSecret) {
    console.log('⚠️ Invalid webhook token');
    return res.status(401).json({ message: 'Invalid webhook token' });
  }

  next();
};

router.use(verifyWebhookToken);

// معالج الأحداث الرئيسي - يستقبل على / و /salla
const webhookHandler = async (req, res) => {
  try {
    const { event, merchant: merchantId, data } = req.body;
    
    console.log(`📨 Webhook received: ${event}`, { merchantId });

    // app.store.authorize - النمط السهل: استقبال التوكن عند تثبيت التطبيق
    if (event === 'app.store.authorize') {
      await handleAppStoreAuthorize(data, merchantId);
      return res.json({ success: true });
    }

    // app.installed - تأكيد تثبيت التطبيق
    if (event === 'app.installed') {
      console.log('✅ App installed for store:', merchantId);
      return res.json({ success: true });
    }

    // البحث عن التاجر
    const merchant = await prisma.merchant.findUnique({
      where: { sallaStoreId: String(merchantId) },
      include: { settings: true },
    });

    if (!merchant) {
      console.log(`⚠️ Merchant not found: ${merchantId}`);
      return res.json({ success: true, message: 'Merchant not found' });
    }

    if (event === 'app.uninstalled') {
      await handleAppUninstalled(merchant);
      return res.json({ success: true });
    }

    if (!merchant.settings?.isEnabled) {
      return res.json({ success: true, message: 'Loyalty disabled' });
    }

    switch (event) {
      case 'order.created':
        await handleOrderCreated(merchant, data);
        break;
      case 'order.updated':
        await handleOrderUpdated(merchant, data);
        break;
      case 'customer.created':
        await handleCustomerCreated(merchant, data);
        break;
      case 'customer.updated':
        await handleCustomerUpdated(merchant, data);
        break;
      default:
        console.log(`⚠️ Unhandled event: ${event}`);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Webhook Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// تسجيل المسارين: / و /salla
router.post('/', webhookHandler);
router.post('/salla', webhookHandler);

// === النمط السهل: معالجة تثبيت التطبيق ===
async function handleAppStoreAuthorize(data, merchantId) {
  try {
    const { access_token, refresh_token, expires } = data;

    if (!access_token) {
      console.log('⚠️ No access_token in app.store.authorize');
      return;
    }

    console.log(`🔑 Received tokens for store: ${merchantId}`);

    // جلب معلومات المتجر باستخدام التوكن
    const sallaService = new SallaService(access_token);
    let storeInfo;
    try {
      storeInfo = await sallaService.getStoreInfo();
    } catch (err) {
      console.error('Failed to get store info:', err.message);
      storeInfo = { id: merchantId, name: `Store ${merchantId}`, email: null };
    }

    const storeId = String(storeInfo.id || merchantId);

    // حفظ أو تحديث التاجر
    const merchant = await prisma.merchant.upsert({
      where: { sallaStoreId: storeId },
      update: {
        storeName: storeInfo.name || `Store ${storeId}`,
        email: storeInfo.email,
        accessToken: access_token,
        refreshToken: refresh_token,
        tokenExpiresAt: expires ? new Date(expires * 1000) : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        isActive: true,
      },
      create: {
        sallaStoreId: storeId,
        storeName: storeInfo.name || `Store ${storeId}`,
        email: storeInfo.email,
        accessToken: access_token,
        refreshToken: refresh_token,
        tokenExpiresAt: expires ? new Date(expires * 1000) : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        settings: {
          create: {}, // إعدادات افتراضية
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

    // إنشاء JWT للتاجر
    const jwtToken = jwt.sign(
      { merchantId: merchant.id, storeId: merchant.sallaStoreId },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    console.log(`✅ Store ${storeInfo.name || storeId} authorized successfully`);
    console.log(`🔗 Dashboard URL: ${config.clientUrl}/dashboard?token=${jwtToken}`);
  } catch (error) {
    console.error('Error handling app.store.authorize:', error);
  }
}

// === معالجات الأحداث ===

// طلب جديد - إضافة نقاط
async function handleOrderCreated(merchant, orderData) {
  const settings = merchant.settings;
  const customerId = String(orderData.customer?.id);
  const orderAmount = parseFloat(orderData.amounts?.total?.amount || orderData.total || 0);
  const orderId = String(orderData.id);

  if (!customerId || orderAmount <= 0) return;

  // البحث عن العميل أو إنشاؤه
  let customer = await prisma.customer.findUnique({
    where: {
      merchantId_sallaCustomerId: {
        merchantId: merchant.id,
        sallaCustomerId: customerId,
      },
    },
    include: { tier: true },
  });

  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        merchantId: merchant.id,
        sallaCustomerId: customerId,
        name: orderData.customer?.name || 'عميل',
        email: orderData.customer?.email,
        phone: orderData.customer?.mobile,
      },
      include: { tier: true },
    });
  }

  // حساب النقاط
  const tierMultiplier = customer.tier?.multiplier || 1;
  const points = PointsService.calculateOrderPoints(orderAmount, settings, tierMultiplier);

  if (points <= 0) return;

  // تاريخ انتهاء النقاط
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + settings.pointsExpiryDays);

  // إضافة النقاط
  await PointsService.addPoints(
    merchant.id,
    customer.id,
    points,
    'EARN_PURCHASE',
    `نقاط شراء - طلب #${orderId}`,
    { orderId, orderAmount, expiresAt }
  );

  console.log(`✅ Added ${points} points to customer ${customer.name} for order ${orderId}`);
}

// تحديث طلب
async function handleOrderUpdated(merchant, orderData) {
  // يمكن التعامل مع حالات مثل الإلغاء أو الاسترجاع
  const status = orderData.status?.slug || orderData.status;
  
  if (status === 'canceled' || status === 'refunded') {
    const customerId = String(orderData.customer?.id);
    const orderId = String(orderData.id);
    
    const customer = await prisma.customer.findUnique({
      where: {
        merchantId_sallaCustomerId: {
          merchantId: merchant.id,
          sallaCustomerId: customerId,
        },
      },
    });

    if (!customer) return;

    // البحث عن نقاط هذا الطلب
    const earnTransaction = await prisma.pointTransaction.findFirst({
      where: {
        merchantId: merchant.id,
        customerId: customer.id,
        orderId,
        type: 'EARN_PURCHASE',
      },
    });

    if (earnTransaction && earnTransaction.points > 0) {
      await PointsService.deductPoints(
        merchant.id,
        customer.id,
        earnTransaction.points,
        'DEDUCT_MANUAL',
        `استرجاع نقاط - طلب ملغي #${orderId}`
      );
      console.log(`↩️ Reversed ${earnTransaction.points} points for cancelled order ${orderId}`);
    }
  }
}

// عميل جديد - نقاط ترحيبية
async function handleCustomerCreated(merchant, customerData) {
  const settings = merchant.settings;
  const sallaCustomerId = String(customerData.id);

  // إنشاء العميل
  const customer = await prisma.customer.upsert({
    where: {
      merchantId_sallaCustomerId: {
        merchantId: merchant.id,
        sallaCustomerId,
      },
    },
    update: {
      name: customerData.name || customerData.first_name || 'عميل',
      email: customerData.email,
      phone: customerData.mobile,
    },
    create: {
      merchantId: merchant.id,
      sallaCustomerId,
      name: customerData.name || customerData.first_name || 'عميل',
      email: customerData.email,
      phone: customerData.mobile,
    },
  });

  // إضافة نقاط التسجيل
  if (settings.signupBonus > 0) {
    await PointsService.addPoints(
      merchant.id,
      customer.id,
      settings.signupBonus,
      'EARN_SIGNUP',
      'نقاط ترحيبية للتسجيل الجديد'
    );
    console.log(`🎉 Added ${settings.signupBonus} signup bonus to ${customer.name}`);
  }
}

// تحديث بيانات العميل
async function handleCustomerUpdated(merchant, customerData) {
  const sallaCustomerId = String(customerData.id);
  
  await prisma.customer.updateMany({
    where: {
      merchantId: merchant.id,
      sallaCustomerId,
    },
    data: {
      name: customerData.name || customerData.first_name,
      email: customerData.email,
      phone: customerData.mobile,
    },
  });
}

// إلغاء تثبيت التطبيق
async function handleAppUninstalled(merchant) {
  await prisma.merchant.update({
    where: { id: merchant.id },
    data: { isActive: false },
  });
  console.log(`❌ App uninstalled for store: ${merchant.storeName}`);
}

module.exports = router;
