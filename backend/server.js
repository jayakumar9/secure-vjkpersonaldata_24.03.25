const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const userRoutes = require('./routes/userRoutes');
const accountRoutes = require('./routes/accountRoutes');
const fileRoutes = require('./routes/fileRoutes');
const authRoutes = require('./routes/authRoutes');
const { initGridFS } = require('./config/gridfs');
const multer = require('multer');

// Load env vars
dotenv.config();

// MongoDB Connection with Status Monitoring
const connectDB = async () => {
  try {
    const options = {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4, // Force IPv4
      retryWrites: true,
      w: 'majority'
    };

    const conn = await mongoose.connect(process.env.MONGODB_URI, options);
    console.log('\x1b[42m%s\x1b[0m', '[Database Status]: MongoDB Connected Successfully');
    console.log('\x1b[36m%s\x1b[0m', `[Server]: Connected to ${conn.connection.host}`);
    
    // Initialize GridFS
    initGridFS();
    
    // Monitor database connection
    mongoose.connection.on('connected', () => {
      console.log('\x1b[42m%s\x1b[0m', '[Database Status]: MongoDB Connected');
    });

    mongoose.connection.on('error', (err) => {
      console.log('\x1b[41m%s\x1b[0m', '[Database Status]: MongoDB Connection Error:', err);
      if (err.message.includes('IP that isn\'t whitelisted')) {
        console.log('\x1b[33m%s\x1b[0m', '[Action Required]: Please whitelist your current IP address in MongoDB Atlas');
        console.log('\x1b[33m%s\x1b[0m', '1. Go to MongoDB Atlas Dashboard');
        console.log('\x1b[33m%s\x1b[0m', '2. Click Network Access');
        console.log('\x1b[33m%s\x1b[0m', '3. Click ADD IP ADDRESS');
        console.log('\x1b[33m%s\x1b[0m', '4. Click ADD CURRENT IP ADDRESS');
      }
      // Try to reconnect
      setTimeout(connectDB, 5000);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('\x1b[43m%s\x1b[0m', '[Database Status]: MongoDB Disconnected');
      // Try to reconnect
      setTimeout(connectDB, 5000);
    });

    // Handle process termination
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('\x1b[43m%s\x1b[0m', '[Database Status]: MongoDB disconnected through app termination');
      process.exit(0);
    });

  } catch (error) {
    console.error('\x1b[41m%s\x1b[0m', '[Database Error]:', error.message);
    if (error.message.includes('IP that isn\'t whitelisted')) {
      console.log('\x1b[33m%s\x1b[0m', '[Action Required]: Please whitelist your current IP address in MongoDB Atlas');
      console.log('\x1b[33m%s\x1b[0m', '1. Go to MongoDB Atlas Dashboard');
      console.log('\x1b[33m%s\x1b[0m', '2. Click Network Access');
      console.log('\x1b[33m%s\x1b[0m', '3. Click ADD IP ADDRESS');
      console.log('\x1b[33m%s\x1b[0m', '4. Click ADD CURRENT IP ADDRESS');
    }
    // Try to reconnect
    setTimeout(connectDB, 5000);
  }
};

// Connect to Database
connectDB();

const app = express();

// Trust proxy - required for rate limiting behind reverse proxies
app.set('trust proxy', 1);

// Body parser
app.use(express.json());

// Enable CORS
app.use(cors({
  origin: process.env.NODE_ENV === 'development' ? '*' : process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", process.env.FRONTEND_URL || 'http://localhost:3000'],
      imgSrc: ["'self'", "data:", "blob:"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      fontSrc: ["'self'", "data:"],
      mediaSrc: ["'self'", "data:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many requests, please try again later.'
    });
  }
});

// Apply rate limiting to API routes
app.use('/api/', limiter);

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Mount routers
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/accounts', accountRoutes);

// Health Check Endpoint
app.get('/api/health', async (req, res) => {
  try {
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    
    const status = {
      server: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      },
      database: {
        status: dbStatus,
        host: mongoose.connection.host || 'unknown',
        readyState: mongoose.connection.readyState
      },
      gridfs: {
        status: 'checking'
      }
    };

    // Check GridFS if database is connected
    if (dbStatus === 'connected') {
      try {
        const bucket = require('./config/gridfs').getBucket();
        if (bucket) {
          status.gridfs.status = 'initialized';
        }
      } catch (error) {
        console.error('[GridFS Check Error]:', error.message);
        status.gridfs = {
          status: 'not initialized',
          error: error.message
        };
      }
    }

    // Determine overall health
    const isHealthy = status.database.status === 'connected' && 
                     status.gridfs.status === 'initialized';

    res.status(isHealthy ? 200 : 503).json(status);
  } catch (error) {
    console.error('[Health Check Error]:', error);
    res.status(500).json({
      server: {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error.message
      },
      database: {
        status: 'unknown'
      },
      gridfs: {
        status: 'unknown'
      }
    });
  }
});

// Not found handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[Error]:', err);

  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      success: false,
      message: 'File upload error',
      error: err.message
    });
  }

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log('\x1b[36m%s\x1b[0m', `[Server]: Server running on port ${PORT}`);
  console.log('\x1b[36m%s\x1b[0m', `[Server]: Health check available at http://localhost:${PORT}/api/health`);
}); 