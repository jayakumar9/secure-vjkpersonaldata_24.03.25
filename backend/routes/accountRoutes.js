const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const fetch = require('node-fetch');
const multer = require('multer');
const mongoose = require('mongoose');
const { getBucket } = require('../config/gridfs');
const { protect, authorize } = require('../middleware/authMiddleware');
const Account = require('../models/Account');
const mime = require('mime');
const path = require('path');
const fs = require('fs');
const User = require('../models/User');

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 16 * 1024 * 1024 // 16MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow only specific file types
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images, PDFs, and documents are allowed.'), false);
    }
  }
});

// Helper function to store file in GridFS
const storeInGridFS = async (file) => {
  try {
    console.log('Storing file in GridFS:', {
      filename: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    });

    const bucket = await getBucket();
    if (!bucket) {
      throw new Error('GridFS bucket not available');
    }

    return new Promise((resolve, reject) => {
      // Create a unique filename to avoid collisions
      const uniqueFilename = `${Date.now()}-${file.originalname}`;
      
      const writeStream = bucket.openUploadStream(uniqueFilename, {
        contentType: file.mimetype,
        metadata: {
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          encoding: file.encoding,
          uploadDate: new Date()
        }
      });

      console.log('Created upload stream with ID:', writeStream.id);

      const readStream = require('stream').Readable.from(file.buffer);
      
      // Handle read stream errors
      readStream.on('error', (error) => {
        console.error('Read stream error:', error);
        writeStream.abort();
        reject(error);
      });

      // Pipe the file data
      readStream.pipe(writeStream);

      writeStream.on('finish', () => {
        console.log('File upload completed. File ID:', writeStream.id);
        resolve(writeStream.id);
      });

      writeStream.on('error', (error) => {
        console.error('Write stream error:', error);
        reject(error);
      });
    });
  } catch (error) {
    console.error('Error in storeInGridFS:', error);
    throw error;
  }
};

// Helper function to fetch website logo
async function fetchWebsiteLogo(website) {
  try {
    // Clean and normalize the website URL
    let cleanWebsite = website.toLowerCase().trim();
    if (!cleanWebsite) {
      return {
        url: 'https://ui-avatars.com/api/?name=Unknown&background=random&size=128',
        status: 'fallback',
        message: 'No website provided'
      };
    }

    // Remove protocol and www if present
    cleanWebsite = cleanWebsite.replace(/^(https?:\/\/)?(www\.)?/, '');
    
    // Remove paths and query parameters
    cleanWebsite = cleanWebsite.split('/')[0];

    // Special handling for common services with known high-quality logos
    const commonServices = {
      'gmail.com': {
        url: 'https://www.google.com/gmail/about/static/images/logo-gmail.png',
        status: 'verified'
      },
      'google.com': {
        url: 'https://www.gstatic.com/images/branding/product/2x/googleg_48dp.png',
        status: 'verified'
      },
      'facebook.com': {
        url: 'https://static.xx.fbcdn.net/rsrc.php/yD/r/d4ZIVX-5C-b.ico',
        status: 'verified'
      },
      'microsoft.com': {
        url: 'https://www.microsoft.com/favicon.ico',
        status: 'verified'
      },
      'github.com': {
        url: 'https://github.githubassets.com/favicons/favicon.svg',
        status: 'verified'
      }
    };

    if (commonServices[cleanWebsite]) {
      return commonServices[cleanWebsite];
    }

    const fetchOptions = {
      timeout: 5000,
      headers: {
        'Accept': 'image/*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    };

    // Try multiple sources in parallel
    const [directFavicon, googleFavicon] = await Promise.allSettled([
      // Try direct favicon.ico
      fetch(`https://${cleanWebsite}/favicon.ico`, fetchOptions)
        .then(async response => {
          if (!response.ok) return null;
          const contentType = response.headers.get('content-type');
          if (!contentType || !contentType.startsWith('image/')) return null;
          return {
            url: `https://${cleanWebsite}/favicon.ico`,
            status: 'direct',
            quality: 'original'
          };
        })
        .catch(() => null),

      // Try Google's favicon service
      fetch(`https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://${cleanWebsite}&size=128`, fetchOptions)
        .then(async response => {
          if (!response.ok) return null;
          const contentType = response.headers.get('content-type');
          if (!contentType || !contentType.startsWith('image/')) return null;
          return {
            url: `https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://${cleanWebsite}&size=128`,
            status: 'google',
            quality: 'enhanced'
          };
        })
        .catch(() => null)
    ]);

    // Get the results
    const directResult = directFavicon.status === 'fulfilled' ? directFavicon.value : null;
    const googleResult = googleFavicon.status === 'fulfilled' ? googleFavicon.value : null;

    console.log(`Logo fetch results for ${cleanWebsite}:`, {
      directFavicon: directResult ? directResult.status : 'Failed',
      googleFavicon: googleResult ? googleResult.status : 'Failed'
    });

    // Choose the best available logo
    if (directResult) {
      console.log(`Using direct favicon.ico for ${cleanWebsite}`);
      return {
        url: directResult.url,
        status: 'success',
        source: 'direct',
        message: 'Using original website favicon'
      };
    } else if (googleResult) {
      console.log(`Using Google's favicon for ${cleanWebsite}`);
      return {
        url: googleResult.url,
        status: 'success',
        source: 'google',
        message: 'Using Google-enhanced favicon'
      };
    }

    // If no valid logo found, return text-based avatar with status
    console.log(`No valid logo found for ${cleanWebsite}, using text-based avatar`);
    const domainFirstLetter = cleanWebsite.charAt(0).toUpperCase();
    const backgroundColor = Math.floor(Math.random()*16777215).toString(16);
    return {
      url: `https://ui-avatars.com/api/?name=${domainFirstLetter}&background=${backgroundColor}&color=fff&size=128&bold=true&font-size=0.8`,
      status: 'fallback',
      message: 'No logo found, using text avatar',
      needsReview: true
    };

  } catch (error) {
    console.error('Error in fetchWebsiteLogo:', error);
    // Fallback to text-based avatar with error status
    const domainFirstLetter = cleanWebsite.charAt(0).toUpperCase();
    return {
      url: `https://ui-avatars.com/api/?name=${domainFirstLetter}&background=random&color=fff&size=128&bold=true&font-size=0.8`,
      status: 'error',
      message: 'Error fetching logo, using text avatar',
      error: error.message,
      needsReview: true
    };
  }
}

// Update account logos periodically
async function updateAccountLogos() {
  try {
    const accounts = await Account.find({}).lean();
    
    for (const account of accounts) {
      try {
        if (!account.website) continue;
        
        const logo = await fetchWebsiteLogo(account.website);
        if (logo && logo !== account.logo) {
          await Account.findByIdAndUpdate(account._id, { logo });
          console.log(`Updated logo for account ${account._id}`);
        }
      } catch (error) {
        console.error(`Error updating logo for account ${account._id}:`, error);
      }
    }
  } catch (error) {
    console.error('Error in updateAccountLogos:', error);
  }
}

// Schedule logo updates
setInterval(updateAccountLogos, 24 * 60 * 60 * 1000); // Run once per day

// Helper function to clean up old file
const cleanupOldFile = async (oldFilePath) => {
  if (oldFilePath) {
    const fullPath = path.join(__dirname, '..', oldFilePath);
    try {
      if (fs.existsSync(fullPath)) {
        // Check if any other account is using this file
        const usingAccounts = await Account.find({ attachedFile: oldFilePath });
        if (usingAccounts.length <= 1) { // If only the current account (or no account) is using it
          fs.unlinkSync(fullPath);
          console.log(`Cleaned up unused file: ${oldFilePath}`);
        }
      }
    } catch (error) {
      console.error('Error cleaning up old file:', error);
    }
  }
};

// Admin check route
router.get('/check-admin', protect, async (req, res) => {
  try {
    // Check if user exists and has role field
    const user = await User.findById(req.user.id).select('+role');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    // Return admin status
    res.json({
      success: true,
      isAdmin: user.role === 'admin',
      role: user.role || 'user'
    });
  } catch (error) {
    console.error('Admin check error:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking admin status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// File viewing route
router.get('/files/:id', protect, async (req, res) => {
  let downloadStream;
  
  try {
    console.log('File request received:', {
      fileId: req.params.id,
      userId: req.user._id,
      timestamp: new Date().toISOString()
    });

    let gridFSId;
    try {
      gridFSId = new mongoose.Types.ObjectId(req.params.id);
      console.log('Converted to ObjectId:', gridFSId.toString());
    } catch (error) {
      console.error('Invalid ObjectId format:', {
        fileId: req.params.id,
        error: error.message
      });
      return res.status(400).json({
        success: false,
        message: 'Invalid file ID format'
      });
    }

    // Get the GridFS bucket
    let bucket;
    try {
      bucket = await getBucket();
      console.log('GridFS bucket status:', !!bucket);
    } catch (error) {
      console.error('Failed to get GridFS bucket:', error);
      return res.status(503).json({
        success: false,
        message: 'File storage system unavailable'
      });
    }

    if (!bucket) {
      console.error('GridFS bucket not available');
      return res.status(503).json({
        success: false,
        message: 'File storage system unavailable'
      });
    }

    // First check if the file exists in GridFS
    let file;
    try {
      file = await bucket.find({ _id: gridFSId }).next();
      console.log('GridFS file lookup result:', {
        found: !!file,
        fileId: gridFSId.toString(),
        filename: file?.filename,
        metadata: file?.metadata,
        size: file?.length,
        uploadDate: file?.uploadDate
      });
    } catch (error) {
      console.error('Error finding file in GridFS:', error);
      return res.status(500).json({
        success: false,
        message: 'Error accessing file in storage'
      });
    }

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found in storage'
      });
    }

    // Now check if the user has access to this file
    const account = await Account.findOne({
      user: req.user._id,
      'attachedFile.gridFSId': gridFSId
    }).lean();

    console.log('Account lookup result:', {
      found: !!account,
      userId: req.user._id,
      fileId: gridFSId.toString(),
      hasAttachedFile: account ? !!account.attachedFile : false,
      attachedFileId: account?.attachedFile?.gridFSId?.toString()
    });

    if (!account) {
      return res.status(404).json({ 
        success: false,
        message: 'File not found or access denied' 
      });
    }

    // Get content type and filename from file metadata
    const contentType = file.contentType || file.metadata?.mimetype || 'application/octet-stream';
    const filename = encodeURIComponent(file.metadata?.originalname || file.filename || 'download');

    console.log('Preparing file download:', {
      fileId: gridFSId.toString(),
      contentType,
      filename,
      size: file.length
    });

    // Set up the download stream
    try {
      downloadStream = bucket.openDownloadStream(gridFSId);
      console.log('Download stream created successfully');
    } catch (error) {
      console.error('Error opening download stream:', error);
      return res.status(500).json({
        success: false,
        message: 'Error preparing file for download'
      });
    }

    // Set headers
    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `inline; filename="${filename}"`,
      'Content-Length': file.length,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    // Handle stream errors
    downloadStream.on('error', (error) => {
      console.error('Download stream error:', {
        fileId: gridFSId.toString(),
        error: error.message
      });
      if (!res.headersSent) {
        res.status(500).json({ 
          success: false,
          message: 'Error streaming file'
        });
      }
      if (downloadStream) {
        downloadStream.destroy();
      }
    });

    // Handle client disconnect
    req.on('close', () => {
      console.log('Client disconnected during download:', gridFSId.toString());
      if (downloadStream) {
        downloadStream.destroy();
      }
    });

    // Stream the file
    downloadStream.pipe(res);

  } catch (error) {
    console.error('File viewing error:', {
      fileId: req.params.id,
      error: error.message,
      stack: error.stack
    });
    if (downloadStream) {
      downloadStream.destroy();
    }
    if (!res.headersSent) {
      res.status(500).json({ 
        success: false,
        message: 'Error accessing file'
      });
    }
  }
});

// Add these utility functions at the top after the imports
const generateStrongPassword = (length = 12) => {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  
  const allChars = uppercase + lowercase + numbers + symbols;
  let password = '';
  
  // Ensure at least one character from each category
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  // Fill the rest of the password
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
};

const getNextSerialNumber = async () => {
  const lastAccount = await Account.findOne().sort({ serialNumber: -1 });
  return lastAccount ? lastAccount.serialNumber + 1 : 1000; // Start from 1000
};

// Add password generation endpoint
router.get('/generate-password', protect, async (req, res) => {
  try {
    const password = generateStrongPassword(16); // Generate 16 character password
    res.json({ password });
  } catch (error) {
    console.error('Password generation error:', error);
    res.status(500).json({ message: 'Error generating password' });
  }
});

// @route   POST /api/accounts
// @desc    Create new account
// @access  Private
router.post('/', protect, upload.single('attachedFile'), async (req, res) => {
  try {
    const serialNumber = await getNextSerialNumber();
    const { website, name, username, email, password, note } = req.body;

    let fileData = null;
    if (req.file) {
      const gridFSId = await storeInGridFS(req.file);
      fileData = {
        filename: req.file.originalname,
        contentType: req.file.mimetype,
        size: req.file.size,
        gridFSId: gridFSId,
        uploadDate: new Date()
      };
    }

    // Fetch logo with status
    const logoResult = await fetchWebsiteLogo(website);
    
    // Create new account
    const account = new Account({
      serialNumber,
      website,
      name,
      username,
      email,
      password,
      note,
      attachedFile: fileData,
      logo: logoResult.url, // Store only the URL
      logoStatus: logoResult.status,
      logoMessage: logoResult.message,
      logoSource: logoResult.source,
      user: req.user._id
    });

    await account.save();

    res.status(201).json({
      message: 'Account created successfully',
      account: {
        ...account.toObject(),
        attachedFile: fileData ? {
          gridFSId: fileData.gridFSId,
          filename: fileData.filename,
          contentType: fileData.contentType,
          size: fileData.size,
          uploadDate: fileData.uploadDate
        } : null,
        logoDetails: logoResult
      }
    });
  } catch (error) {
    console.error('Account creation error:', error);
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/accounts
// @desc    Get all accounts for logged in user
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    console.log('Fetching accounts for user:', req.user.id);

    const accounts = await Account.find({ user: req.user.id })
      .sort({ serialNumber: 1 })
      .lean()
      .exec();

    // Transform accounts to ensure file data is complete
    const transformedAccounts = accounts.map(account => ({
      ...account,
      attachedFile: account.attachedFile ? {
        gridFSId: account.attachedFile.gridFSId,
        filename: account.attachedFile.filename,
        contentType: account.attachedFile.contentType,
        size: account.attachedFile.size,
        uploadDate: account.attachedFile.uploadDate
      } : null
    }));

    console.log('Found accounts:', transformedAccounts.length);
    console.log('Sample file data:', transformedAccounts.find(a => a.attachedFile)?.attachedFile || 'No files found');

    res.json(transformedAccounts);
  } catch (error) {
    console.error('Error fetching accounts:', error);
    res.status(500).json({ 
      message: 'Error fetching accounts',
      details: error.message 
    });
  }
});

// @route   GET /api/accounts/:id
// @desc    Get account by ID
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const account = await Account.findById(req.params.id);

    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }

    // Make sure user owns account
    if (account.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({ message: 'Not authorized' });
    }

    res.json(account);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error' });
  }
});

// @route   PUT /api/accounts/:id
// @desc    Update account
// @access  Private
router.put('/:id', protect, upload.single('attachedFile'), async (req, res) => {
  try {
    const account = await Account.findById(req.params.id);
    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }

    // Check ownership
    if (account.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    let fileData = account.attachedFile;
    if (req.file) {
      // Delete old file if it exists
      if (account.attachedFile && account.attachedFile.gridFSId) {
        try {
          const bucket = await getBucket();
          await bucket.delete(account.attachedFile.gridFSId);
        } catch (error) {
          console.error('Error deleting old file:', error);
        }
      }

      // Store new file
      const gridFSId = await storeInGridFS(req.file);
      fileData = {
        filename: req.file.originalname,
        contentType: req.file.mimetype,
        size: req.file.size,
        gridFSId: gridFSId,
        uploadDate: new Date()
      };
    }

    // Fetch new logo if website changed
    let logoUpdate = {};
    if (req.body.website && req.body.website !== account.website) {
      const logoResult = await fetchWebsiteLogo(req.body.website);
      logoUpdate = {
        logo: logoResult.url,
        logoStatus: logoResult.status,
        logoMessage: logoResult.message,
        logoSource: logoResult.source
      };
    }

    const updatedAccount = await Account.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        attachedFile: fileData,
        ...logoUpdate
      },
      { new: true }
    );

    res.json({
      message: 'Account updated successfully',
      account: {
        ...updatedAccount.toObject(),
        attachedFile: fileData ? {
          gridFSId: fileData.gridFSId,
          filename: fileData.filename,
          contentType: fileData.contentType,
          size: fileData.size,
          uploadDate: fileData.uploadDate
        } : null
      }
    });
  } catch (error) {
    console.error('Account update error:', error);
    res.status(500).json({ message: error.message });
  }
});

// @route   DELETE /api/accounts/:id
// @desc    Delete account
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const account = await Account.findById(req.params.id);

    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }

    // Make sure user owns account
    if (account.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({ message: 'Not authorized' });
    }

    // Delete attached file if it exists
    if (account.attachedFile && account.attachedFile.gridFSId) {
      const bucket = await getBucket();
      try {
        await bucket.delete(account.attachedFile.gridFSId);
      } catch (error) {
        console.error('Error deleting file from GridFS:', error);
      }
    }

    await Account.findByIdAndDelete(req.params.id);

    res.json({ message: 'Account removed' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

// @route   GET /api/accounts/cleanup-uploads
// @desc    Clean up unused files in uploads directory
// @access  Private/Admin
router.get('/cleanup-uploads', protect, authorize('admin'), async (req, res) => {
  try {
    // Get all accounts with their file paths
    const accounts = await Account.find({}, 'attachedFile');
    const validFilePaths = new Set(accounts.map(acc => acc.attachedFile).filter(Boolean));

    // Read all files in the uploads directory
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    const files = fs.readdirSync(uploadsDir);

    // Track deleted files and errors
    const deletedFiles = [];
    const errors = [];

    // Check each file
    for (const file of files) {
      const filePath = path.join('uploads', file);
      // If file is not in database, delete it
      if (!validFilePaths.has(filePath)) {
        try {
          fs.unlinkSync(path.join(__dirname, '..', 'uploads', file));
          deletedFiles.push(file);
        } catch (err) {
          errors.push({ file, error: err.message });
        }
      }
    }

    res.json({
      success: true,
      message: 'Cleanup completed',
      deletedFiles,
      errors,
      remainingFiles: files.length - deletedFiles.length
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({ message: 'Error during cleanup', error: error.message });
  }
});

// @route   POST /api/accounts/update-logos
// @desc    Update all account logos
// @access  Private (Admin only)
router.post('/update-logos', protect, authorize('admin'), async (req, res) => {
  try {
    console.log('Starting manual logo update for all accounts');
    await updateAccountLogos();
    res.json({ message: 'Logo update process started' });
  } catch (error) {
    console.error('Manual logo update error:', error);
    res.status(500).json({ message: 'Error updating logos' });
  }
});

// Trigger initial logo update when server starts
setTimeout(updateAccountLogos, 5000);

module.exports = router; 