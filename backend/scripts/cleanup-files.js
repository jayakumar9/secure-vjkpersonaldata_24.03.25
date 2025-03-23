const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');
require('dotenv').config();

async function cleanupGridFS() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    
    // Get all collections
    const collections = await db.listCollections().toArray();
    console.log('Found collections:', collections.map(c => c.name));

    // Check for all file-related collections
    const gridFSCollections = collections.filter(c => 
      c.name.startsWith('fs.') || 
      c.name.startsWith('uploads.') ||
      c.name.startsWith('files.')
    );
    console.log('Found file-related collections:', gridFSCollections.map(c => c.name));

    // Delete files from each GridFS bucket
    const processedBuckets = new Set();
    for (const coll of gridFSCollections) {
      const bucketName = coll.name.split('.')[0];
      
      // Skip if we've already processed this bucket
      if (processedBuckets.has(bucketName)) {
        continue;
      }
      processedBuckets.add(bucketName);
      
      console.log(`\nProcessing bucket: ${bucketName}`);
      const bucket = new GridFSBucket(db, { bucketName });
      
      try {
        // Get all files
        const files = await bucket.find().toArray();
        console.log(`Found ${files.length} files in ${bucketName}`);

        // Delete each file
        for (const file of files) {
          try {
            await bucket.delete(file._id);
            console.log(`Deleted file: ${file.filename} (${file._id})`);
          } catch (error) {
            console.error(`Error deleting file ${file._id}:`, error.message);
          }
        }
      } catch (error) {
        console.error(`Error processing bucket ${bucketName}:`, error.message);
      }
    }

    // Drop all file-related collections
    console.log('\nDropping collections...');
    for (const coll of gridFSCollections) {
      try {
        await db.collection(coll.name).drop();
        console.log(`Dropped collection: ${coll.name}`);
      } catch (error) {
        console.error(`Error dropping collection ${coll.name}:`, error.message);
      }
    }

    // Update accounts to remove file references
    console.log('\nUpdating accounts...');
    const result = await db.collection('accounts').updateMany(
      { attachedFile: { $exists: true } },
      { $set: { attachedFile: null } }
    );
    console.log(`Updated ${result.modifiedCount} accounts`);

    console.log('\nCleanup completed successfully');
  } catch (error) {
    console.error('Cleanup error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the cleanup
cleanupGridFS().catch(console.error); 