const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
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
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📦 Environment: ${config.nodeEnv}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down...');
  await prisma.$disconnect();
  process.exit(0);
});

module.exports = app;
