const prisma = require('../config/database');

class PointsService {
  
  // إضافة نقاط للعميل
  static async addPoints(merchantId, customerId, points, type, description, meta = {}) {
    const result = await prisma.$transaction(async (tx) => {
      // إنشاء معاملة النقاط
      const transaction = await tx.pointTransaction.create({
        data: {
          merchantId,
          customerId,
          type,
          points,
          description,
          orderId: meta.orderId || null,
          orderAmount: meta.orderAmount || null,
          couponId: meta.couponId || null,
          expiresAt: meta.expiresAt || null,
        },
      });

      // تحديث رصيد العميل
      const customer = await tx.customer.update({
        where: { id: customerId },
        data: {
          totalPoints: { increment: points },
          currentPoints: { increment: points },
        },
      });

      // تحديث مستوى العميل
      await PointsService.updateCustomerTier(tx, merchantId, customer);

      return { transaction, customer };
    });

    return result;
  }

  // خصم نقاط من العميل
  static async deductPoints(merchantId, customerId, points, type, description, meta = {}) {
    const result = await prisma.$transaction(async (tx) => {
      // التحقق من الرصيد
      const customer = await tx.customer.findUnique({ where: { id: customerId } });
      if (customer.currentPoints < points) {
        throw new Error('رصيد النقاط غير كافٍ');
      }

      // إنشاء معاملة خصم
      const transaction = await tx.pointTransaction.create({
        data: {
          merchantId,
          customerId,
          type,
          points: -points,
          description,
          couponId: meta.couponId || null,
        },
      });

      // تحديث رصيد العميل
      const updatedCustomer = await tx.customer.update({
        where: { id: customerId },
        data: {
          usedPoints: { increment: points },
          currentPoints: { decrement: points },
        },
      });

      return { transaction, customer: updatedCustomer };
    });

    return result;
  }

  // حساب النقاط من مبلغ الطلب
  static calculateOrderPoints(orderAmount, settings, tierMultiplier = 1) {
    if (orderAmount < settings.minOrderAmount) return 0;
    const basePoints = Math.floor(orderAmount * settings.pointsPerRiyal);
    return Math.floor(basePoints * tierMultiplier);
  }

  // حساب قيمة الخصم من النقاط
  static calculateDiscountFromPoints(points, settings) {
    return points / settings.pointsPerDiscount;
  }

  // تحديث مستوى العميل
  static async updateCustomerTier(tx, merchantId, customer) {
    const tiers = await tx.tier.findMany({
      where: { merchantId },
      orderBy: { minPoints: 'desc' },
    });

    let newTierId = null;
    for (const tier of tiers) {
      if (customer.totalPoints >= tier.minPoints) {
        newTierId = tier.id;
        break;
      }
    }

    if (newTierId !== customer.tierId) {
      await tx.customer.update({
        where: { id: customer.id },
        data: { tierId: newTierId },
      });
    }
  }

  // الحصول على سجل نقاط العميل
  static async getCustomerTransactions(customerId, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [transactions, total] = await Promise.all([
      prisma.pointTransaction.findMany({
        where: { customerId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.pointTransaction.count({ where: { customerId } }),
    ]);

    return {
      transactions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // التحقق من انتهاء صلاحية النقاط
  static async processExpiredPoints(merchantId) {
    const expiredTransactions = await prisma.pointTransaction.findMany({
      where: {
        merchantId,
        type: 'EARN_PURCHASE',
        expiresAt: { lte: new Date() },
        points: { gt: 0 },
      },
    });

    for (const tx of expiredTransactions) {
      await PointsService.deductPoints(
        merchantId,
        tx.customerId,
        tx.points,
        'EXPIRED',
        'انتهاء صلاحية النقاط'
      );
    }

    return expiredTransactions.length;
  }
}

module.exports = PointsService;
