const express = require('express');
const router = express.Router();
const { getBucket, isInitialized } = require('../config/gridfs');
const { upload, uploadToGridFS } = require('../middleware/gridfsUpload');
const { ObjectId } = require('mongodb');

// Middleware to check GridFS initialization
const checkGridFS = (req, res, next) => {
  try {
    if (!isInitialized()) {
      throw new Error('GridFS not initialized');
    }
    next();
  } catch (error) {
    console.error('GridFS check error:', error);
    res.status(503).json({
      success: false,
      message: 'File system unavailable',
      error: error.message
    });
  }
};

// Get all files
router.get('/', checkGridFS, async (req, res) => {
  try {
    const bucket = getBucket();
    const files = await bucket.find({}).toArray();
    
    res.json({
      success: true,
      files: files.map(file => ({
        _id: file._id,
        filename: file.filename,
        metadata: file.metadata,
        uploadDate: file.uploadDate,
        length: file.length
      }))
    });
  } catch (error) {
    console.error('List files error:', error);
    res.status(500).json({
      success: false,
      message: 'Error listing files',
      error: error.message
    });
  }
});

// Upload file to GridFS
router.post('/upload', checkGridFS, upload.single('file'), uploadToGridFS, async (req, res) => {
  try {
    if (!req.fileId) {
      return res.status(400).json({ 
        success: false, 
        message: 'No file uploaded' 
      });
    }
    res.status(201).json({
      success: true,
      fileId: req.fileId,
      message: 'File uploaded successfully'
    });
  } catch (error) {
    console.error('Upload route error:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading file',
      error: error.message
    });
  }
});

// Download or view file from GridFS
router.get('/download/:fileId', checkGridFS, async (req, res) => {
  try {
    const bucket = getBucket();
    const fileId = new ObjectId(req.params.fileId);
    
    // Check if file exists first
    const file = await bucket.find({ _id: fileId }).next();
    
    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Check file size (15MB limit)
    if (file.length > 15 * 1024 * 1024) {
      return res.status(413).json({
        success: false,
        message: 'File size exceeds 15MB limit'
      });
    }

    const contentType = file.metadata?.contentType || 'application/octet-stream';
    const isImage = contentType.startsWith('image/');
    const isPDF = contentType === 'application/pdf';
    const isViewable = isImage || isPDF;

    // Set appropriate headers
    res.set('Content-Type', contentType);
    res.set('Cache-Control', 'no-cache');
    
    if (isViewable) {
      // For images and PDFs, display in browser
      res.set('Content-Disposition', 'inline');
    } else {
      // For other files, force download
      res.set('Content-Disposition', `attachment; filename="${file.filename}"`);
    }

    // Stream the file
    const downloadStream = bucket.openDownloadStream(fileId);
    
    // Handle download stream errors
    downloadStream.on('error', (error) => {
      console.error('Download stream error:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Error streaming file',
          error: error.message
        });
      }
    });

    // Handle client disconnect
    req.on('close', () => {
      downloadStream.destroy();
    });

    // Pipe the file to response
    downloadStream.pipe(res);
  } catch (error) {
    console.error('Download route error:', error);
    if (error.message.includes('ObjectId')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file ID format'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error accessing file',
      error: error.message
    });
  }
});

// Delete file from GridFS
router.delete('/:fileId', checkGridFS, async (req, res) => {
  try {
    const bucket = getBucket();
    const fileId = new ObjectId(req.params.fileId);
    
    // Check if file exists first
    const file = await bucket.find({ _id: fileId }).next();
    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }
    
    await bucket.delete(fileId);
    res.json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    console.error('Delete route error:', error);
    if (error.message.includes('ObjectId')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file ID format'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error deleting file',
      error: error.message
    });
  }
});

module.exports = router; 