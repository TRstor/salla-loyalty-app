const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const { execSync } = require('child_process');
const session = require('express-session');
const config = require('./config');
const prisma = require('./config/database');

// Routes
const authRoutes = require('./routes/auth');
const webhookRoutes = require('./routes/webhooks');
const merchantRoutes = require('./routes/merchant');
const customerRoutes = require('./routes/customer');
const pointsRoutes = require('./routes/points');
const settingsRoutes = require('./routes/settings');
const tiersRoutes = require('./routes/tiers');
const couponRoutes = require('./routes/coupons');
const statsRoutes = require('./routes/stats');

const app = express();

// Trust proxy (needed for Render / reverse proxies)
app.set('trust proxy', 1);

// Middleware
app.use(helmet({
  frameguard: false, // السماح بعرض التطبيق داخل iframe سلة
  contentSecurityPolicy: false,
}));
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    const allowedOrigins = config.clientUrl.split(',').map(u => u.trim());
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));
app.use(cookieParser());
app.use(session({
  secret: config.session.secret,
  resave: false,
  saveUninitialized: false,
}));

// JSON parser for all routes (including webhooks - Token mode doesn't need raw body)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Webhook routes
app.use('/api/webhooks', webhookRoutes);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/merchant', merchantRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/points', pointsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/tiers', tiersRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/stats', statsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// === Seed: إنشاء تاجر تجريبي (للاختبار فقط) ===
app.post('/api/seed/test-merchant', async (req, res) => {
  try {
    const testStoreId = '12345';
    
    const merchant = await prisma.merchant.upsert({
      where: { sallaStoreId: testStoreId },
      update: { isActive: true },
      create: {
        sallaStoreId: testStoreId,
        storeName: 'متجر تجريبي',
        email: 'test@test.com',
        accessToken: 'test-token',
        refreshToken: 'test-refresh',
        tokenExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        settings: { create: {} },
        tiers: {
          createMany: {
            data: [
              { name: 'Bronze', nameAr: 'برونزي', minPoints: 0, multiplier: 1, color: '#CD7F32', sortOrder: 1 },
              { name: 'Silver', nameAr: 'فضي', minPoints: 500, multiplier: 1.5, color: '#C0C0C0', sortOrder: 2 },
              { name: 'Gold', nameAr: 'ذهبي', minPoints: 2000, multiplier: 2, color: '#FFD700', sortOrder: 3 },
              { name: 'Platinum', nameAr: 'بلاتيني', minPoints: 5000, multiplier: 3, color: '#E5E4E2', sortOrder: 4 },
            ],
          },
        },
      },
    });
    
    res.json({ success: true, storeId: testStoreId, message: 'تاجر تجريبي تم إنشاؤه. استخدم Store ID: 12345' });
  } catch (error) {
    console.error('Seed error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// === تسجيل يدوي للتاجر (عند فشل الـ webhook) ===
app.get('/api/manual-register', (req, res) => {
  res.send(`<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>تسجيل التاجر يدوياً</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 600px; margin: 40px auto; padding: 20px; background: #f5f5f5; }
    .card { background: white; padding: 30px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    h1 { color: #004d40; text-align: center; }
    p { color: #666; text-align: center; }
    label { display: block; margin-top: 15px; font-weight: bold; color: #333; }
    textarea, input { width: 100%; padding: 10px; margin-top: 5px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; box-sizing: border-box; }
    textarea { height: 200px; direction: ltr; font-family: monospace; }
    button { width: 100%; padding: 12px; margin-top: 20px; background: #004d40; color: white; border: none; border-radius: 8px; font-size: 16px; cursor: pointer; }
    button:hover { background: #00695c; }
    #result { margin-top: 15px; padding: 15px; border-radius: 8px; display: none; }
    .success { background: #e8f5e9; color: #2e7d32; }
    .error { background: #ffebee; color: #c62828; }
  </style>
</head>
<body>
  <div class="card">
    <h1>تسجيل التاجر يدوياً</h1>
    <p>الصق محتوى webhook الـ app.store.authorize هنا</p>
    <label>محتوى الـ Webhook (JSON):</label>
    <textarea id="webhookData" placeholder='الصق الـ JSON الكامل هنا...'></textarea>
    <button onclick="register()">تسجيل التاجر</button>
    <div id="result"></div>
  </div>
  <script>
    async function register() {
      const resultDiv = document.getElementById('result');
      const data = document.getElementById('webhookData').value.trim();
      if (!data) { resultDiv.style.display='block'; resultDiv.className='error'; resultDiv.textContent='الرجاء لصق البيانات'; return; }
      try {
        const json = JSON.parse(data);
        const resp = await fetch('/api/manual-register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(json)
        });
        const result = await resp.json();
        resultDiv.style.display = 'block';
        if (result.success) {
          resultDiv.className = 'success';
          resultDiv.textContent = 'تم تسجيل التاجر بنجاح! Store ID: ' + result.storeId;
        } else {
          resultDiv.className = 'error';
          resultDiv.textContent = 'خطأ: ' + result.message;
        }
      } catch (e) {
        resultDiv.style.display = 'block';
        resultDiv.className = 'error';
        resultDiv.textContent = 'خطأ: تأكد أن البيانات JSON صحيح - ' + e.message;
      }
    }
  </script>
</body>
</html>`);
});

app.post('/api/manual-register', async (req, res) => {
  try {
    const { merchant: merchantId, data } = req.body;
    if (!data || !data.access_token) {
      return res.status(400).json({ success: false, message: 'البيانات ناقصة - يجب أن يحتوي على access_token' });
    }

    const { access_token, refresh_token, expires } = data;
    const storeId = String(merchantId);

    console.log('📝 Manual merchant registration for store:', storeId);

    const merchant = await prisma.merchant.upsert({
      where: { sallaStoreId: storeId },
      update: {
        accessToken: access_token,
        refreshToken: refresh_token,
        tokenExpiresAt: expires ? new Date(expires * 1000) : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        isActive: true,
      },
      create: {
        sallaStoreId: storeId,
        storeName: data.app_name || 'Store ' + storeId,
        accessToken: access_token,
        refreshToken: refresh_token,
        tokenExpiresAt: expires ? new Date(expires * 1000) : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        settings: { create: {} },
        tiers: {
          createMany: {
            data: [
              { name: 'Bronze', nameAr: 'برونزي', minPoints: 0, multiplier: 1, color: '#CD7F32', sortOrder: 1 },
              { name: 'Silver', nameAr: 'فضي', minPoints: 500, multiplier: 1.5, color: '#C0C0C0', sortOrder: 2 },
              { name: 'Gold', nameAr: 'ذهبي', minPoints: 2000, multiplier: 2, color: '#FFD700', sortOrder: 3 },
              { name: 'Platinum', nameAr: 'بلاتيني', minPoints: 5000, multiplier: 3, color: '#E5E4E2', sortOrder: 4 },
            ],
          },
        },
      },
    });

    res.json({ success: true, storeId, message: 'تم تسجيل التاجر بنجاح' });
  } catch (error) {
    console.error('Manual register error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'خطأ في الخادم',
    ...(config.nodeEnv === 'development' && { stack: err.stack }),
  });
});

// Start server
const PORT = config.port;

// Run migrations on startup
async function runMigrations() {
  try {
    console.log('🔄 Running database migrations...');
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });
    console.log('✅ Migrations completed successfully');
  } catch (error) {
    console.error('⚠️ Migration error (may already be applied):', error.message);
  }
}

runMigrations().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📦 Environment: ${config.nodeEnv}`);
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down...');
  await prisma.$disconnect();
  process.exit(0);
});

module.exports = app;
