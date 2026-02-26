const jwt = require('jsonwebtoken');
const config = require('../config');
const prisma = require('../config/database');

// التحقق من توكن التاجر
const authMerchant = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies?.token;
    
    if (!token) {
      return res.status(401).json({ success: false, message: 'غير مصرح - يرجى تسجيل الدخول' });
    }
    
    const decoded = jwt.verify(token, config.jwt.secret);
    const merchant = await prisma.merchant.findUnique({
      where: { id: decoded.merchantId },
      include: { settings: true },
    });
    
    if (!merchant || !merchant.isActive) {
      return res.status(401).json({ success: false, message: 'حساب التاجر غير موجود أو غير نشط' });
    }
    
    req.merchant = merchant;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, message: 'توكن غير صالح' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'انتهت صلاحية التوكن' });
    }
    next(error);
  }
};

// التحقق من العميل
const authCustomer = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '') || req.query.token;
    
    if (!token) {
      return res.status(401).json({ success: false, message: 'غير مصرح' });
    }
    
    const decoded = jwt.verify(token, config.jwt.secret);
    const customer = await prisma.customer.findUnique({
      where: { id: decoded.customerId },
      include: { tier: true, merchant: { include: { settings: true } } },
    });
    
    if (!customer) {
      return res.status(401).json({ success: false, message: 'العميل غير موجود' });
    }
    
    req.customer = customer;
    req.merchant = customer.merchant;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { authMerchant, authCustomer };
