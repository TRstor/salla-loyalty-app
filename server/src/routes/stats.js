const express = require('express');
const { authMerchant } = require('../middlewares/auth');
const prisma = require('../config/database');

const router = express.Router();
router.use(authMerchant);

// إحصائيات عامة
router.get('/', async (req, res) => {
  try {
    const merchantId = req.merchant.id;

    const [
      totalCustomers,
      totalPointsIssued,
      totalPointsRedeemed,
      totalCoupons,
      activeCoupons,
      recentTransactions,
      customersByTier,
      monthlyPoints,
    ] = await Promise.all([
      // إجمالي العملاء
      prisma.customer.count({ where: { merchantId } }),
      
      // إجمالي النقاط الممنوحة
      prisma.pointTransaction.aggregate({
        where: { merchantId, points: { gt: 0 } },
        _sum: { points: true },
      }),
      
      // إجمالي النقاط المستخدمة
      prisma.pointTransaction.aggregate({
        where: { merchantId, points: { lt: 0 } },
        _sum: { points: true },
      }),
      
      // إجمالي الكوبونات
      prisma.coupon.count({ where: { merchantId } }),
      
      // الكوبونات النشطة
      prisma.coupon.count({
        where: { merchantId, isUsed: false, expiresAt: { gte: new Date() } },
      }),
      
      // آخر المعاملات
      prisma.pointTransaction.findMany({
        where: { merchantId },
        include: { customer: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      
      // العملاء حسب المستوى
      prisma.tier.findMany({
        where: { merchantId },
        include: { _count: { select: { customers: true } } },
        orderBy: { sortOrder: 'asc' },
      }),
      
      // النقاط الشهرية (آخر 6 أشهر)
      getMonthlyPointsStats(merchantId),
    ]);

    res.json({
      success: true,
      stats: {
        totalCustomers,
        totalPointsIssued: totalPointsIssued._sum.points || 0,
        totalPointsRedeemed: Math.abs(totalPointsRedeemed._sum.points || 0),
        totalCoupons,
        activeCoupons,
        recentTransactions,
        customersByTier: customersByTier.map(t => ({
          name: t.nameAr,
          color: t.color,
          count: t._count.customers,
        })),
        monthlyPoints,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// أفضل العملاء
router.get('/top-customers', async (req, res) => {
  try {
    const customers = await prisma.customer.findMany({
      where: { merchantId: req.merchant.id },
      include: { tier: true },
      orderBy: { totalPoints: 'desc' },
      take: 10,
    });

    res.json({ success: true, customers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// دالة مساعدة: إحصائيات النقاط الشهرية
async function getMonthlyPointsStats(merchantId) {
  const months = [];
  const now = new Date();

  for (let i = 5; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);

    const [earned, redeemed] = await Promise.all([
      prisma.pointTransaction.aggregate({
        where: {
          merchantId,
          createdAt: { gte: start, lte: end },
          points: { gt: 0 },
        },
        _sum: { points: true },
      }),
      prisma.pointTransaction.aggregate({
        where: {
          merchantId,
          createdAt: { gte: start, lte: end },
          points: { lt: 0 },
        },
        _sum: { points: true },
      }),
    ]);

    months.push({
      month: start.toLocaleDateString('ar-SA', { month: 'short', year: 'numeric' }),
      earned: earned._sum.points || 0,
      redeemed: Math.abs(redeemed._sum.points || 0),
    });
  }

  return months;
}

module.exports = router;
