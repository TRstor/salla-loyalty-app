const express = require('express');
const { authMerchant } = require('../middlewares/auth');
const prisma = require('../config/database');

const router = express.Router();
router.use(authMerchant);

// قائمة المستويات
router.get('/', async (req, res) => {
  try {
    const tiers = await prisma.tier.findMany({
      where: { merchantId: req.merchant.id },
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: { select: { customers: true } },
      },
    });
    res.json({ success: true, tiers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// إضافة مستوى
router.post('/', async (req, res) => {
  try {
    const { name, nameAr, minPoints, multiplier, color, icon, benefits, sortOrder } = req.body;

    const tier = await prisma.tier.create({
      data: {
        merchantId: req.merchant.id,
        name,
        nameAr,
        minPoints: parseInt(minPoints),
        multiplier: parseFloat(multiplier) || 1,
        color: color || '#CD7F32',
        icon: icon || 'star',
        benefits: benefits || null,
        sortOrder: parseInt(sortOrder) || 0,
      },
    });

    res.json({ success: true, tier, message: 'تم إضافة المستوى بنجاح' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// تحديث مستوى
router.put('/:id', async (req, res) => {
  try {
    const { name, nameAr, minPoints, multiplier, color, icon, benefits, sortOrder } = req.body;

    const tier = await prisma.tier.updateMany({
      where: { id: req.params.id, merchantId: req.merchant.id },
      data: {
        ...(name && { name }),
        ...(nameAr && { nameAr }),
        ...(minPoints !== undefined && { minPoints: parseInt(minPoints) }),
        ...(multiplier !== undefined && { multiplier: parseFloat(multiplier) }),
        ...(color && { color }),
        ...(icon && { icon }),
        ...(benefits !== undefined && { benefits }),
        ...(sortOrder !== undefined && { sortOrder: parseInt(sortOrder) }),
      },
    });

    res.json({ success: true, message: 'تم تحديث المستوى بنجاح' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// حذف مستوى
router.delete('/:id', async (req, res) => {
  try {
    await prisma.tier.deleteMany({
      where: { id: req.params.id, merchantId: req.merchant.id },
    });
    res.json({ success: true, message: 'تم حذف المستوى بنجاح' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
