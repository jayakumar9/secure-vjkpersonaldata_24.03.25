const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');

let bucket = null;
let initializationAttempted = false;
let initializationPromise = null;

const initGridFS = async () => {
  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = new Promise(async (resolve, reject) => {
    try {
      if (!mongoose.connection || !mongoose.connection.db) {
        throw new Error('Database connection not available');
      }

      if (bucket) {
        console.log('\x1b[36m%s\x1b[0m', '[GridFS Status]: Already initialized');
        resolve(bucket);
        return;
      }

      // Wait for any pending operations
      await mongoose.connection.db.admin().ping();

      bucket = new GridFSBucket(mongoose.connection.db, {
        bucketName: 'fs'
      });

      // Verify bucket by listing files
      await bucket.find().limit(1).next();
      
      initializationAttempted = true;
      console.log('\x1b[42m%s\x1b[0m', '[GridFS Status]: GridFS Initialized Successfully');
      resolve(bucket);
    } catch (error) {
      console.error('\x1b[41m%s\x1b[0m', '[GridFS Error]:', error.message);
      initializationAttempted = true;
      bucket = null;
      reject(error);
    } finally {
      initializationPromise = null;
    }
  });

  return initializationPromise;
};

const getBucket = async () => {
  try {
    if (!bucket && !initializationAttempted) {
      // Try to initialize if not attempted before
      return await initGridFS();
    }
    if (!bucket) {
      throw new Error('GridFS not initialized');
    }
    return bucket;
  } catch (error) {
    console.error('\x1b[41m%s\x1b[0m', '[GridFS Error]: Failed to get bucket:', error.message);
    throw error;
  }
};

const resetGridFS = () => {
  bucket = null;
  initializationAttempted = false;
  initializationPromise = null;
};

// Listen for database connection changes
mongoose.connection.on('connected', async () => {
  console.log('\x1b[36m%s\x1b[0m', '[GridFS Status]: Attempting to initialize after connection');
  try {
    await initGridFS();
  } catch (error) {
    console.error('\x1b[41m%s\x1b[0m', '[GridFS Error]: Failed to initialize after connection:', error.message);
  }
});

mongoose.connection.on('disconnected', () => {
  console.log('\x1b[33m%s\x1b[0m', '[GridFS Status]: Resetting due to disconnection');
  resetGridFS();
});

// Export status check function
const getGridFSStatus = async () => {
  try {
    const currentBucket = await getBucket();
    if (!currentBucket) {
      return { status: 'unavailable', message: 'GridFS not initialized' };
    }
    
    // Test bucket by trying to list files
    await currentBucket.find().limit(1).next();
    return { status: 'initialized', message: 'GridFS is working properly' };
  } catch (error) {
    return { 
      status: 'error', 
      message: error.message,
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    };
  }
};

module.exports = {
  initGridFS,
  getBucket,
  resetGridFS,
  getGridFSStatus
}; 