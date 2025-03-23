const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { getBucket } = require('../config/gridfs');

router.get('/health', async (req, res) => {
  // Add cache control headers
  res.set({
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });

  try {
    // Check database connection first
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    
    // Prepare initial status object
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

    // Only check GridFS if database is connected
    if (dbStatus === 'connected') {
      try {
        // Try to get the bucket - this will throw if not initialized
        const bucket = getBucket();
        if (bucket) {
          status.gridfs = {
            status: 'initialized',
            bucketName: bucket.s.options.bucketName
          };
        }
      } catch (error) {
        console.error('[GridFS Check Error]:', error.message);
        // Don't mark as error if initialization is in progress
        if (error.message.includes('not initialized')) {
          status.gridfs = {
            status: 'initializing'
          };
        } else {
          status.gridfs = {
            status: 'error',
            error: error.message
          };
        }
      }
    } else {
      status.gridfs = {
        status: 'unavailable',
        message: 'Database connection required'
      };
    }

    // Determine overall health - consider 'initializing' as healthy
    const isHealthy = status.database.status === 'connected' && 
                     (status.gridfs.status === 'initialized' || status.gridfs.status === 'initializing');

    // Add overall health status
    status.overall = {
      healthy: isHealthy,
      message: isHealthy ? 'All systems operational' : 'System degraded'
    };

    // Log health check result
    console.log('[Health Check] Status:', {
      database: status.database.status,
      gridfs: status.gridfs.status,
      healthy: isHealthy
    });

    res.status(isHealthy ? 200 : 503).json(status);
  } catch (error) {
    console.error('[Health Check Error]:', error);
    
    // Ensure consistent error response structure
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
      },
      overall: {
        healthy: false,
        message: 'Health check failed'
      }
    });
  }
});

module.exports = router; 