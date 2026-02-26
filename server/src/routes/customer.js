const express = require('express');
const { authMerchant, authCustomer } = require('../middlewares/auth');
const prisma = require('../config/database');
const jwt = require('jsonwebtoken');
const config = require('../config');

const router = express.Router();

// === مسارات التاجر ===

// قائمة العملاء
router.get('/', authMerchant, async (req, res) => {
  try {
    const { page = 1, limit = 20, search, tier } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = { merchantId: req.merchant.id };
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ];
    }
    
    if (tier) {
      where.tierId = tier;
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        include: { tier: true },
        orderBy: { currentPoints: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.customer.count({ where }),
    ]);

    res.json({
      success: true,
      customers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// تفاصيل عميل
router.get('/:id', authMerchant, async (req, res) => {
  try {
    const customer = await prisma.customer.findFirst({
      where: { id: req.params.id, merchantId: req.merchant.id },
      include: {
        tier: true,
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        coupons: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!customer) {
      return res.status(404).json({ success: false, message: 'العميل غير موجود' });
    }

    res.json({ success: true, customer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// === مسار العميل - عرض بياناته ===

// الحصول على توكن العميل (يُستخدم من صفحة العميل)
router.post('/auth', async (req, res) => {
  try {
    const { merchantId, sallaCustomerId } = req.body;
    
    const customer = await prisma.customer.findUnique({
      where: {
        merchantId_sallaCustomerId: {
          merchantId,
          sallaCustomerId: String(sallaCustomerId),
        },
      },
    });

    if (!customer) {
      return res.status(404).json({ success: false, message: 'العميل غير موجود' });
    }

    const token = jwt.sign(
      { customerId: customer.id, merchantId },
      config.jwt.secret,
      { expiresIn: '30d' }
    );

    res.json({ success: true, token });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// بيانات العميل الحالي
router.get('/me/profile', authCustomer, async (req, res) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: req.customer.id },
      include: {
        tier: true,
        merchant: { select: { storeName: true, settings: true } },
      },
    });

    // جلب المستوى التالي
    const nextTier = await prisma.tier.findFirst({
      where: {
        merchantId: req.merchant.id,
        minPoints: { gt: customer.totalPoints },
      },
      orderBy: { minPoints: 'asc' },
    });

    res.json({
      success: true,
      customer: {
        ...customer,
        nextTier,
        pointsToNextTier: nextTier ? nextTier.minPoints - customer.totalPoints : 0,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// كود الإحالة الخاص بالعميل
router.get('/me/referral', authCustomer, async (req, res) => {
  try {
    let referralCode = await prisma.referralCode.findFirst({
      where: {
        referrerId: req.customer.id,
        isUsed: false,
      },
    });

    if (!referralCode) {
      const code = `REF-${req.customer.id.slice(0, 6).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
      referralCode = await prisma.referralCode.create({
        data: {
          merchantId: req.merchant.id,
          referrerId: req.customer.id,
          code,
        },
      });
    }

    const totalReferrals = await prisma.referralCode.count({
      where: { referrerId: req.customer.id, isUsed: true },
    });

    res.json({ success: true, referralCode: referralCode.code, totalReferrals });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
