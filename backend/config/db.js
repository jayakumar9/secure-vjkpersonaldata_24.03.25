const mongoose = require('mongoose');
const { initGridFS, resetGridFS } = require('./gridfs');

const connectDB = async () => {
  try {
    const options = {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4,
      retryWrites: true,
      w: 'majority'
    };

    // Reset GridFS before attempting connection
    resetGridFS();

    const conn = await mongoose.connect(process.env.MONGODB_URI, options);
    
    console.log('\x1b[42m%s\x1b[0m', '[Database Status]: MongoDB Connected Successfully');
    console.log('\x1b[36m%s\x1b[0m', `[Server]: Connected to ${conn.connection.host}`);
    
    // Initialize GridFS after successful connection
    try {
      await initGridFS();
    } catch (error) {
      console.error('\x1b[41m%s\x1b[0m', '[GridFS Error]: Initial setup failed:', error.message);
      // Don't throw here - let the application continue even if GridFS fails
    }
    
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
      // Reset GridFS on connection error
      resetGridFS();
      // Try to reconnect
      setTimeout(connectDB, 5000);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('\x1b[43m%s\x1b[0m', '[Database Status]: MongoDB Disconnected');
      // Reset GridFS on disconnection
      resetGridFS();
      // Try to reconnect
      setTimeout(connectDB, 5000);
    });

    // Handle process termination
    process.on('SIGINT', async () => {
      resetGridFS();
      await mongoose.connection.close();
      console.log('\x1b[43m%s\x1b[0m', '[Database Status]: MongoDB disconnected through app termination');
      process.exit(0);
    });

  } catch (error) {
    console.error('\x1b[41m%s\x1b[0m', '[Database Error]:', error.message);
    // Reset GridFS on connection failure
    resetGridFS();
    // Exit process with failure
    process.exit(1);
  }
};

// Function to create necessary indexes
const createIndexes = async () => {
  try {
    const collections = await mongoose.connection.db.collections();
    
    for (let collection of collections) {
      if (collection.collectionName === 'accounts') {
        // Create compound unique indexes
        await collection.createIndex({ username: 1, website: 1 }, { unique: true });
        await collection.createIndex({ email: 1, website: 1 }, { unique: true });
        console.log('Account indexes created successfully');
      }
    }
  } catch (error) {
    console.error('Error creating indexes:', error);
  }
};

module.exports = connectDB; 