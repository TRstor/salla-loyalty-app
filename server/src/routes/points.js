const express = require('express');
const { authMerchant, authCustomer } = require('../middlewares/auth');
const PointsService = require('../services/pointsService');
const prisma = require('../config/database');

const router = express.Router();

// === مسارات التاجر ===

// سجل معاملات النقاط
router.get('/transactions', authMerchant, async (req, res) => {
  try {
    const { page = 1, limit = 20, customerId, type } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = { merchantId: req.merchant.id };
    if (customerId) where.customerId = customerId;
    if (type) where.type = type;

    const [transactions, total] = await Promise.all([
      prisma.pointTransaction.findMany({
        where,
        include: {
          customer: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.pointTransaction.count({ where }),
    ]);

    res.json({
      success: true,
      transactions,
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

// إضافة نقاط يدوياً
router.post('/add', authMerchant, async (req, res) => {
  try {
    const { customerId, points, description } = req.body;
    
    if (!customerId || !points || points <= 0) {
      return res.status(400).json({ success: false, message: 'بيانات غير صحيحة' });
    }

    const customer = await prisma.customer.findFirst({
      where: { id: customerId, merchantId: req.merchant.id },
    });

    if (!customer) {
      return res.status(404).json({ success: false, message: 'العميل غير موجود' });
    }

    const result = await PointsService.addPoints(
      req.merchant.id,
      customerId,
      parseInt(points),
      'EARN_BONUS',
      description || 'نقاط إضافية من التاجر'
    );

    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// خصم نقاط يدوياً
router.post('/deduct', authMerchant, async (req, res) => {
  try {
    const { customerId, points, description } = req.body;
    
    if (!customerId || !points || points <= 0) {
      return res.status(400).json({ success: false, message: 'بيانات غير صحيحة' });
    }

    const result = await PointsService.deductPoints(
      req.merchant.id,
      customerId,
      parseInt(points),
      'DEDUCT_MANUAL',
      description || 'خصم يدوي من التاجر'
    );

    res.json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// === مسارات العميل ===

// سجل نقاط العميل الحالي
router.get('/me/history', authCustomer, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const result = await PointsService.getCustomerTransactions(
      req.customer.id,
      parseInt(page),
      parseInt(limit)
    );
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
