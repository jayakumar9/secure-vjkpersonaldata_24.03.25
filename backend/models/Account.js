const mongoose = require('mongoose');
const crypto = require('crypto');

const accountSchema = new mongoose.Schema({
  serialNumber: {
    type: Number,
    required: true,
    unique: true
  },
  website: {
    type: String,
    required: [true, 'Please add a website'],
    trim: true
  },
  name: {
    type: String,
    required: [true, 'Please add a name'],
    trim: true
  },
  username: {
    type: String,
    required: [true, 'Please add a username'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: 6
  },
  isPasswordVisible: {
    type: Boolean,
    default: false
  },
  isAutoGenerated: {
    type: Boolean,
    default: false
  },
  logo: {
    type: String,
    default: ''
  },
  logoStatus: {
    type: String,
    enum: ['verified', 'success', 'fallback', 'error'],
    default: 'fallback'
  },
  logoMessage: {
    type: String
  },
  logoSource: {
    type: String,
    enum: ['direct', 'google', 'verified', 'fallback'],
  },
  attachedFile: {
    type: {
      gridFSId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'fs.files'
      },
      filename: String,
      contentType: String,
      size: Number,
      uploadDate: {
        type: Date,
        default: Date.now
      }
    },
    _id: false
  },
  note: {
    type: String,
    trim: true
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Add virtual for file URL
accountSchema.virtual('fileUrl').get(function() {
  if (this.attachedFile && this.attachedFile.gridFSId) {
    return `/api/accounts/files/${this.attachedFile.gridFSId}`;
  }
  return null;
});

// Static method to generate a strong password
accountSchema.statics.generateStrongPassword = function(length = 16) {
  const uppercaseChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercaseChars = 'abcdefghijklmnopqrstuvwxyz';
  const numberChars = '0123456789';
  const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  
  const allChars = uppercaseChars + lowercaseChars + numberChars + specialChars;
  
  // Ensure at least one of each type
  let password = 
    uppercaseChars[Math.floor(Math.random() * uppercaseChars.length)] +
    lowercaseChars[Math.floor(Math.random() * lowercaseChars.length)] +
    numberChars[Math.floor(Math.random() * numberChars.length)] +
    specialChars[Math.floor(Math.random() * specialChars.length)];
  
  // Fill the rest randomly
  for(let i = 4; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
};

// Compound unique index for username and website
accountSchema.index({ username: 1, website: 1 }, { unique: true });

// Compound unique index for email and website
accountSchema.index({ email: 1, website: 1 }, { unique: true });

// Pre-save hook for website logo and serial number
accountSchema.pre('save', async function(next) {
  try {
    if (this.isModified('website')) {
      // Add https:// prefix if no protocol specified
      const websiteUrl = this.website.startsWith('http') ? this.website : `https://${this.website}`;
      
      try {
        const url = new URL(websiteUrl);
        const hostname = url.hostname;
        
        // Known sites with their direct logo URLs
        const knownSites = {
          'github.com': 'https://github.githubassets.com/favicons/favicon.svg',
          'mongodb.com': 'https://www.mongodb.com/assets/images/global/favicon.ico',
          'google.com': 'https://www.google.com/favicon.ico',
          'gmail.com': 'https://www.google.com/gmail/about/static/images/favicon.ico',
          'yahoo.com': 'https://s.yimg.com/cv/apiv2/default/icons/favicon_y19_32x32_custom.svg',
          'microsoft.com': 'https://www.microsoft.com/favicon.ico',
          'linkedin.com': 'https://static.licdn.com/sc/h/akt4ae504epesldzj74dzred8',
          'facebook.com': 'https://static.xx.fbcdn.net/rsrc.php/yD/r/d4ZIVX-5C-b.ico',
          'twitter.com': 'https://abs.twimg.com/favicons/twitter.ico',
          'amazon.com': 'https://www.amazon.com/favicon.ico'
        };

        if (knownSites[hostname]) {
          this.logo = knownSites[hostname];
        } else {
          // Try Google's favicon service
          this.logo = `https://www.google.com/s2/favicons?domain=${hostname}&sz=128`;
        }
      } catch (error) {
        // If URL parsing fails, use a text-based avatar
        const cleanName = this.website.replace(/^https?:\/\//, '');
        this.logo = `https://ui-avatars.com/api/?name=${encodeURIComponent(cleanName)}&background=random&size=128`;
      }
    }
    
    // Handle serial number for new accounts
    if (this.isNew) {
      const lastAccount = await this.constructor.findOne({}, {}, { sort: { 'serialNumber': -1 } });
      this.serialNumber = lastAccount ? lastAccount.serialNumber + 1 : 1;
    }

    // Ensure attachedFile is properly structured
    if (this.attachedFile && !this.attachedFile.gridFSId && typeof this.attachedFile === 'object') {
      // If attachedFile is just an ObjectId, convert it to proper structure
      const gridFSId = this.attachedFile;
      this.attachedFile = {
        gridFSId: gridFSId,
        uploadDate: new Date()
      };
    }

    next();
  } catch (error) {
    console.error('Error in pre-save hook:', error);
    next(error);
  }
});

// Pre-remove hook to clean up GridFS files
accountSchema.pre('remove', async function(next) {
  try {
    if (this.attachedFile && this.attachedFile.gridFSId) {
      const { getBucket } = require('../config/gridfs');
      const bucket = getBucket();
      if (bucket) {
        try {
          await bucket.delete(this.attachedFile.gridFSId);
        } catch (error) {
          console.error('Error deleting file from GridFS:', error);
        }
      }
    }
    next();
  } catch (error) {
    console.error('Error in pre-remove hook:', error);
    next(error);
  }
});

module.exports = mongoose.model('Account', accountSchema); 