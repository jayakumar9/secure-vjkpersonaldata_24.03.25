const config = {
  development: {
    url: 'mongodb://localhost:27017/secure-vjkpersonaldata',
    options: {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4,
      autoIndex: true
    }
  },
  test: {
    url: 'mongodb://localhost:27017/secure-vjkpersonaldata-test',
    options: {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4,
      autoIndex: true
    }
  },
  production: {
    url: process.env.MONGODB_URI,
    options: {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4,
      autoIndex: false // Don't build indexes in production
    }
  }
};

module.exports = config[process.env.NODE_ENV || 'development']; 