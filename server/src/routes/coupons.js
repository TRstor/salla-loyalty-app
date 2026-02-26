const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { authMerchant, authCustomer } = require('../middlewares/auth');
const prisma = require('../config/database');
const PointsService = require('../services/pointsService');
const SallaService = require('../services/sallaService');

const router = express.Router();

// === مسارات التاجر ===

// قائمة الكوبونات
router.get('/', authMerchant, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [coupons, total] = await Promise.all([
      prisma.coupon.findMany({
        where: { merchantId: req.merchant.id },
        include: {
          customer: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.coupon.count({ where: { merchantId: req.merchant.id } }),
    ]);

    res.json({
      success: true,
      coupons,
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

// === مسارات العميل ===

// استبدال نقاط بكوبون خصم
router.post('/redeem', authCustomer, async (req, res) => {
  try {
    const { points } = req.body;
    const customer = req.customer;
    const settings = req.merchant.settings;

    // التحقق من الحد الأدنى
    if (!points || points < settings.minRedeemPoints) {
      return res.status(400).json({
        success: false,
        message: `الحد الأدنى لاستبدال النقاط هو ${settings.minRedeemPoints} نقطة`,
      });
    }

    // التحقق من الرصيد
    if (customer.currentPoints < points) {
      return res.status(400).json({
        success: false,
        message: 'رصيد النقاط غير كافٍ',
      });
    }

    // حساب قيمة الخصم
    const discountAmount = PointsService.calculateDiscountFromPoints(points, settings);
    
    // إنشاء كود كوبون فريد
    const couponCode = `LOYALTY-${uuidv4().slice(0, 8).toUpperCase()}`;
    
    // تاريخ انتهاء الكوبون (30 يوم)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // إنشاء الكوبون في سلة
    let sallaCouponId = null;
    try {
      if (req.merchant.accessToken) {
        const sallaService = new SallaService(req.merchant.accessToken);
        const sallaCoupon = await sallaService.createCoupon({
          code: couponCode,
          discountAmount,
          discountType: 'fixed',
          expiresAt: expiresAt.toISOString().split('T')[0],
        });
        sallaCouponId = String(sallaCoupon.id);
      }
    } catch (sallaError) {
      console.error('Salla Coupon Error:', sallaError.message);
      // نستمر حتى لو فشل إنشاء الكوبون في سلة
    }

    // حفظ الكوبون في قاعدة البيانات
    const coupon = await prisma.coupon.create({
      data: {
        merchantId: req.merchant.id,
        customerId: customer.id,
        code: couponCode,
        discountAmount,
        discountType: 'fixed',
        pointsUsed: points,
        sallaCouponId,
        expiresAt,
      },
    });

    // خصم النقاط
    await PointsService.deductPoints(
      req.merchant.id,
      customer.id,
      points,
      'REDEEM_COUPON',
      `استبدال ${points} نقطة بكوبون خصم ${discountAmount} ر.س`,
      { couponId: coupon.id }
    );

    res.json({
      success: true,
      coupon: {
        code: couponCode,
        discountAmount,
        expiresAt,
        pointsUsed: points,
      },
      message: `تم إنشاء كوبون بقيمة ${discountAmount} ر.س`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// كوبونات العميل الحالي
router.get('/me', authCustomer, async (req, res) => {
  try {
    const coupons = await prisma.coupon.findMany({
      where: { customerId: req.customer.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, coupons });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
