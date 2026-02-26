const express = require('express');
const crypto = require('crypto');
const config = require('../config');
const prisma = require('../config/database');
const PointsService = require('../services/pointsService');

const router = express.Router();

// Webhook parser (raw body)
router.use(express.raw({ type: 'application/json' }));

// التحقق من توقيع Webhook
const verifyWebhookSignature = (req, res, next) => {
  const signature = req.headers['x-salla-signature'];
  
  if (!signature || !config.salla.webhookSecret) {
    // في بيئة التطوير، نتخطى التحقق
    if (config.nodeEnv === 'development') {
      req.body = JSON.parse(req.body);
      return next();
    }
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const hash = crypto
    .createHmac('sha256', config.salla.webhookSecret)
    .update(req.body)
    .digest('hex');

  if (hash !== signature) {
    return res.status(401).json({ message: 'Invalid signature' });
  }

  req.body = JSON.parse(req.body);
  next();
};

router.use(verifyWebhookSignature);

// معالج الأحداث الرئيسي
router.post('/', async (req, res) => {
  try {
    const { event, merchant: merchantId, data } = req.body;
    
    console.log(`📨 Webhook received: ${event}`, { merchantId });

    // البحث عن التاجر
    const merchant = await prisma.merchant.findUnique({
      where: { sallaStoreId: String(merchantId) },
      include: { settings: true },
    });

    if (!merchant || !merchant.settings?.isEnabled) {
      return res.json({ success: true, message: 'Merchant not found or loyalty disabled' });
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
      case 'app.store.authorize':
        console.log('✅ App authorized for store:', merchantId);
        break;
      case 'app.uninstalled':
        await handleAppUninstalled(merchant);
        break;
      default:
        console.log(`⚠️ Unhandled event: ${event}`);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Webhook Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

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
