const express = require('express');
const { authMerchant } = require('../middlewares/auth');
const prisma = require('../config/database');

const router = express.Router();
router.use(authMerchant);

// الحصول على الإعدادات
router.get('/', async (req, res) => {
  try {
    let settings = await prisma.loyaltySettings.findUnique({
      where: { merchantId: req.merchant.id },
    });

    if (!settings) {
      settings = await prisma.loyaltySettings.create({
        data: { merchantId: req.merchant.id },
      });
    }

    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// تحديث الإعدادات
router.put('/', async (req, res) => {
  try {
    const {
      pointsPerRiyal,
      minOrderAmount,
      pointsExpiryDays,
      pointsPerDiscount,
      minRedeemPoints,
      maxDiscountPercent,
      signupBonus,
      referralBonus,
      referredBonus,
      isEnabled,
      programName,
    } = req.body;

    const settings = await prisma.loyaltySettings.upsert({
      where: { merchantId: req.merchant.id },
      update: {
        ...(pointsPerRiyal !== undefined && { pointsPerRiyal: parseFloat(pointsPerRiyal) }),
        ...(minOrderAmount !== undefined && { minOrderAmount: parseFloat(minOrderAmount) }),
        ...(pointsExpiryDays !== undefined && { pointsExpiryDays: parseInt(pointsExpiryDays) }),
        ...(pointsPerDiscount !== undefined && { pointsPerDiscount: parseInt(pointsPerDiscount) }),
        ...(minRedeemPoints !== undefined && { minRedeemPoints: parseInt(minRedeemPoints) }),
        ...(maxDiscountPercent !== undefined && { maxDiscountPercent: parseFloat(maxDiscountPercent) }),
        ...(signupBonus !== undefined && { signupBonus: parseInt(signupBonus) }),
        ...(referralBonus !== undefined && { referralBonus: parseInt(referralBonus) }),
        ...(referredBonus !== undefined && { referredBonus: parseInt(referredBonus) }),
        ...(isEnabled !== undefined && { isEnabled }),
        ...(programName !== undefined && { programName }),
      },
      create: {
        merchantId: req.merchant.id,
        pointsPerRiyal: parseFloat(pointsPerRiyal) || 1,
        minOrderAmount: parseFloat(minOrderAmount) || 0,
        pointsExpiryDays: parseInt(pointsExpiryDays) || 365,
        pointsPerDiscount: parseInt(pointsPerDiscount) || 100,
        minRedeemPoints: parseInt(minRedeemPoints) || 100,
        maxDiscountPercent: parseFloat(maxDiscountPercent) || 50,
        signupBonus: parseInt(signupBonus) || 50,
        referralBonus: parseInt(referralBonus) || 100,
        referredBonus: parseInt(referredBonus) || 50,
        isEnabled: isEnabled !== undefined ? isEnabled : true,
        programName: programName || 'برنامج الولاء',
      },
    });

    res.json({ success: true, settings, message: 'تم تحديث الإعدادات بنجاح' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
