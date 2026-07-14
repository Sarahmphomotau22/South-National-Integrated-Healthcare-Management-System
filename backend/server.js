'use strict';

const express      = require('express');
const mongoose     = require('mongoose');
const helmet       = require('helmet');
const cors         = require('cors');
const morgan       = require('morgan');
const compression  = require('compression');
const mongoSanitize= require('express-mongo-sanitize');
const rateLimit    = require('express-rate-limit');
require('dotenv').config();

const logger  = require('./utils/logger');
const { errorHandler, notFound } = require('./middleware/errorHandler');

// ── Route imports ──
const authRoutes         = require('./routes/auth');
const userRoutes         = require('./routes/users');
const patientRoutes      = require('./routes/patients');
const appointmentRoutes  = require('./routes/appointments');
const prescriptionRoutes = require('./routes/prescriptions');
const medicationRoutes   = require('./routes/medications');
const labRoutes          = require('./routes/labs');
const facilityRoutes     = require('./routes/facilities');
const analyticsRoutes    = require('./routes/analytics');
const queueRoutes        = require('./routes/queue');

const app = express();
const PORT = parseInt(process.env.PORT) || 5000;

// ── Security ──
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5500,http://127.0.0.1:5500,null')
  .split(',').map(o => o.trim());

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    // Auto-allow Railway, Vercel, Netlify deployment URLs
    const isCloud = /\.(railway\.app|up\.railway\.app|vercel\.app|netlify\.app|onrender\.com)$/.test(origin);
    if (isCloud) return cb(null, true);
    // Auto-allow any private network IP (LAN access)
    const localNet = /^http:\/\/(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)/.test(origin);
    if (localNet) return cb(null, true);
    logger.error(`CORS blocked: ${origin} — add to CLIENT_ORIGIN in .env`);
    cb(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization']
}));

app.use(rateLimit({
  windowMs: 15 * 60 * 1000, max: 200,
  standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: 'Too many requests.' }
}));

// ── General middleware ──
app.use(compression());

// Serve uploaded ID documents
app.use('/uploads', express.static(require('path').join(__dirname, 'uploads')));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(mongoSanitize());
app.use(morgan('dev'));
app.use('/api/v1/queue2', require('./routes/queue2'));
// ── Health check (works even without DB) ──
app.get('/health', (_req, res) => {
  const dbState = ['disconnected','connected','connecting','disconnecting'];
  res.json({
    status: 'ok',
    env: process.env.NODE_ENV || 'development',
    db: dbState[mongoose.connection.readyState] || 'unknown',
    port: PORT
  });
});

// ── Routes ──
app.use('/api/v1/auth',          authRoutes);
app.use('/api/v1/users',         userRoutes);
app.use('/api/v1/patients',      patientRoutes);
app.use('/api/v1/appointments',  appointmentRoutes);
app.use('/api/v1/prescriptions', prescriptionRoutes);
app.use('/api/v1/medications',   medicationRoutes);
app.use('/api/v1/labs',          labRoutes);
app.use('/api/v1/queue2',         require('./routes/queue2'));
app.use('/api/v1/facilities',    facilityRoutes);
app.use('/api/v1/analytics',     analyticsRoutes);
app.use('/api/v1/queue',         queueRoutes);

app.use(notFound);
app.use(errorHandler);

// ── Start server first, then connect DB ──
// Server starts immediately so you can see /health even if DB is down
const http = require('http');
const httpServer = http.createServer(app);
const { initSignaling } = require('./utils/signaling');
initSignaling(httpServer);
const { startScheduler } = require('./utils/scheduler');
httpServer.listen(PORT, () => {
  logger.info(`Server running on http://localhost:${PORT}`);
  logger.info(`Health check: http://localhost:${PORT}/health`);
  connectWithRetry().then(() => startScheduler());
});
httpServer.on('error', err => {
  if (err.code === 'EADDRINUSE') { logger.error(`Port ${PORT} in use. Run: netstat -ano | findstr :${PORT} then taskkill /PID <n> /F`); process.exit(1); }
});

// ── MongoDB connection with retry ──
async function connectWithRetry(attempt = 1) {
  const uri = process.env.MONGO_URI;

  if (!uri || uri.includes('YOUR_')) {
    logger.error('─────────────────────────────────────────');
    logger.error('MONGO_URI is not set in your .env file!');
    logger.error('Open nihms-backend/.env and set it.');
    logger.error('─────────────────────────────────────────');
    return;
  }

  const creds = uri.match(/^mongodb(?:\+srv)?:\/\/([^:]+):([^@]+)@/);
  if (!creds) {
    logger.error('MONGO_URI format is invalid. Check your .env file.');
    return;
  }

  const strategies = buildStrategies(uri, creds[1], creds[2]);

  for (const { label, connectionUri, opts } of strategies) {
    try {
      logger.info(`[DB] Attempt ${attempt} — trying ${label}…`);
      await mongoose.connect(connectionUri, {
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 10000,
        socketTimeoutMS: 30000,
        family: 4,
        ...opts
      });
      logger.info(`[DB] Connected via ${label}`);
      return;
    } catch (err) {
      logger.warn(`[DB] ${label} failed: ${err.message.substring(0, 120)}`);
      if (mongoose.connection.readyState !== 0) {
        try { await mongoose.connection.close(); } catch(_) {}
      }
    }
  }

  // All strategies failed — wait and retry
  const wait = Math.min(attempt * 5, 30);
  logger.error(`[DB] All strategies failed. Retrying in ${wait}s… (attempt ${attempt})`);
  logger.error('[DB] Checklist:');
  logger.error('  1. Atlas → Network Access → "Allow Access from Anywhere" (0.0.0.0/0)');
  logger.error('  2. Atlas → Database Access → user exists with correct password');
  logger.error('  3. Try phone hotspot to rule out router firewall');
  logger.error('  4. Run: Test-NetConnection ac-hrstpxa-shard-00-00.gwti7gs.mongodb.net -Port 27017');

  setTimeout(() => connectWithRetry(attempt + 1), wait * 1000);
}

function buildStrategies(uri, user, rawPass) {
  const pass       = encodeURIComponent(decodeURIComponent(rawPass));
  const shardId    = 'gwti7gs';
  const prefix     = 'ac-hrstpxa';
  const replicaSet = `atlas-${shardId}-shard-0`;
  const hosts27017 = `${prefix}-shard-00-00.${shardId}.mongodb.net:27017,${prefix}-shard-00-01.${shardId}.mongodb.net:27017,${prefix}-shard-00-02.${shardId}.mongodb.net:27017`;
  const hosts443   = `${prefix}-shard-00-00.${shardId}.mongodb.net:443,${prefix}-shard-00-01.${shardId}.mongodb.net:443,${prefix}-shard-00-02.${shardId}.mongodb.net:443`;
  const dbAuth     = `/nihms?authSource=admin&replicaSet=${replicaSet}&retryWrites=true&w=majority`;

  return [
    // 1. Original URI from .env
    { label: 'original .env URI',     connectionUri: uri,                                                             opts: {} },
    // 2. Direct port 27017 with ssl
    { label: 'direct port 27017/ssl', connectionUri: `mongodb://${user}:${pass}@${hosts27017}${dbAuth}&ssl=true`,    opts: {} },
    // 3. Direct port 27017 with tls
    { label: 'direct port 27017/tls', connectionUri: `mongodb://${user}:${pass}@${hosts27017}${dbAuth}&tls=true`,    opts: {} },
    // 4. Port 443 (bypasses firewalls)
    { label: 'direct port 443',       connectionUri: `mongodb://${user}:${pass}@${hosts443}${dbAuth}&ssl=true`,      opts: {} },
    // 5. Port 443 with tlsAllowInvalidCertificates (last resort)
    { label: 'port 443 (relaxed TLS)',connectionUri: `mongodb://${user}:${pass}@${hosts443}${dbAuth}&ssl=true`,      opts: { tlsAllowInvalidCertificates: true } },
  ];
}

process.on('SIGTERM', async () => {
  await mongoose.connection.close();
  process.exit(0);
});
