const multer = require('multer');
const { getBucket } = require('../config/gridfs');

// Configure multer for memory storage
const storage = multer.memoryStorage();

// File filter function
const fileFilter = (req, file, cb) => {
  // Check file size (15MB limit)
  if (file.size > 15 * 1024 * 1024) {
    return cb(new Error('File size exceeds 15MB limit'), false);
  }

  // Check file type
  const allowedTypes = process.env.ALLOWED_FILE_TYPES.split(',');
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only allowed types are: ' + allowedTypes.join(', ')), false);
  }
};

// Configure multer upload
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 15 * 1024 * 1024 // 15MB limit
  },
  fileFilter: fileFilter
});

// Middleware to handle file upload to GridFS
const uploadToGridFS = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const bucket = getBucket();
    const uploadStream = bucket.openUploadStream(req.file.originalname, {
      metadata: {
        contentType: req.file.mimetype,
        originalname: req.file.originalname,
        size: req.file.size
      }
    });

    // Handle upload stream events
    uploadStream.on('error', (error) => {
      console.error('Upload stream error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error uploading file to GridFS',
        error: error.message
      });
    });

    uploadStream.on('finish', (file) => {
      req.fileId = file._id;
      next();
    });

    // Write the file buffer to the upload stream
    uploadStream.end(req.file.buffer);
  } catch (error) {
    console.error('Upload middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error processing file upload',
      error: error.message
    });
  }
};

module.exports = {
  upload,
  uploadToGridFS
}; 