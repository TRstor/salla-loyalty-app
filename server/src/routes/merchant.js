const express = require('express');
const { authMerchant } = require('../middlewares/auth');
const prisma = require('../config/database');

const router = express.Router();
router.use(authMerchant);

// معلومات التاجر
router.get('/profile', async (req, res) => {
  try {
    const merchant = await prisma.merchant.findUnique({
      where: { id: req.merchant.id },
      select: {
        id: true,
        sallaStoreId: true,
        storeName: true,
        email: true,
        isActive: true,
        createdAt: true,
      },
    });
    res.json({ success: true, merchant });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
