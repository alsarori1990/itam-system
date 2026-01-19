import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config();

// Import routes
import assetsRouter from './routes/assets.js';
import ticketsRouter from './routes/tickets.js';
import ticketsResolutionRouter from './routes/ticketsResolution.js';
import subscriptionsRouter from './routes/subscriptions.js';
import simCardsRouter from './routes/simcards.js';
import usersRouter from './routes/users.js';
import authRouter from './routes/auth.js';
import reportsRouter from './routes/reports.js';
import auditRouter from './routes/audit.js';
import configRouter from './routes/config.js';
import emailAccountsRouter from './routes/emailAccounts.js';
import emailTemplatesRouter from './routes/emailTemplates.js';
import notificationEventsRouter from './routes/notificationEvents.js';
import emailLogsRouter from './routes/emailLogs.js';
import inboundEmailConfigsRouter from './routes/inboundEmailConfigs.js';
import inboundEmailsRouter from './routes/inboundEmails.js';
import emailBlacklistRouter from './routes/emailBlacklist.js';

// Import services
import emailService from './services/emailService.js';
import { seedEmailSystem } from './seedEmailSystem.js';
import Config from './models/Config.js';
import './workers/emailQueueWorker.js';
import './workers/emailFetcherWorker.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy - nginx sends X-Forwarded-For header
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(compression());

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Disable caching for API responses
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files (uploaded images)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Rate limiting - Increased limits for development/testing
const limiter = rateLimit({
  windowMs: (process.env.RATE_LIMIT_WINDOW || 1) * 60 * 1000, // 1 minute window
  max: process.env.RATE_LIMIT_MAX || 1000, // 1000 requests per minute
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Database connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    
    // Load SMTP settings from database after connection
    try {
      const smtpConfig = await Config.findOne({ key: 'smtp_settings' });
      if (smtpConfig && smtpConfig.value) {
        emailService.configure(smtpConfig.value);
        console.log('📧 Email service initialized with saved settings');
      }
    } catch (error) {
      console.error('⚠️ Failed to load SMTP settings:', error.message);
    }
  } catch (error) {
    console.error(`❌ Database Connection Error: ${error.message}`);
    process.exit(1);
  }
};

// Connect to database and seed email system
connectDB().then(() => {
  // Seed email templates and notification events on first startup
  seedEmailSystem().catch(err => console.error('Seed error:', err));
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
  });
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/assets', assetsRouter);
app.use('/api/tickets', ticketsRouter);
app.use('/api/tickets', ticketsResolutionRouter);
app.use('/api/subscriptions', subscriptionsRouter);
app.use('/api/sim-cards', simCardsRouter);
app.use('/api/simCards', simCardsRouter); // Alternative route for frontend compatibility
app.use('/api/users', usersRouter);
app.use('/api/email-accounts', emailAccountsRouter);
app.use('/api/email-templates', emailTemplatesRouter);
app.use('/api/notification-events', notificationEventsRouter);
app.use('/api/email-logs', emailLogsRouter);
app.use('/api/inbound-email-configs', inboundEmailConfigsRouter);
app.use('/api/inbound-emails', inboundEmailsRouter);
app.use('/api/email-blacklist', emailBlacklistRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/audit', auditRouter);
app.use('/api/config', configRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  mongoose.connection.close(() => {
    console.log('Database connection closed');
    process.exit(0);
  });
});

// Start server
app.listen(PORT, process.env.HOST || '0.0.0.0', async () => {
  console.log(`
  ╔═══════════════════════════════════════════════════════╗
  ║   🚀 ITAM System Backend Server                       ║
  ║   📡 Server running on: http://localhost:${PORT}       ║
  ║   🌍 Environment: ${process.env.NODE_ENV || 'development'}                    ║
  ║   📅 Started: ${new Date().toLocaleString('ar-SA')}   ║
  ╚═══════════════════════════════════════════════════════╝
  `);
});

export default app;
