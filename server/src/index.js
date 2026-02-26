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
