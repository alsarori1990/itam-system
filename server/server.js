import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';

// Load environment variables
dotenv.config();

// Import routes
import assetsRouter from './routes/assets.js';
import ticketsRouter from './routes/tickets.js';
import subscriptionsRouter from './routes/subscriptions.js';
import simCardsRouter from './routes/simcards.js';
import usersRouter from './routes/users.js';
import authRouter from './routes/auth.js';
import reportsRouter from './routes/reports.js';
import auditRouter from './routes/audit.js';

const app = express();
const PORT = process.env.PORT || 5000;

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

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: (process.env.RATE_LIMIT_WINDOW || 15) * 60 * 1000,
  max: process.env.RATE_LIMIT_MAX || 100,
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
  } catch (error) {
    console.error(`❌ Database Connection Error: ${error.message}`);
    process.exit(1);
  }
};

// Connect to database
connectDB();

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
app.use('/api/subscriptions', subscriptionsRouter);
app.use('/api/sim-cards', simCardsRouter);
app.use('/api/simCards', simCardsRouter); // Alternative route for frontend compatibility
app.use('/api/users', usersRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/audit', auditRouter);

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
app.listen(PORT, process.env.HOST || '0.0.0.0', () => {
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
