const mongoose = require('mongoose');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

const environments = [
  {
    dbName: 'secure-data-prod',
    adminUser: {
      name: 'Production Admin',
      username: 'admin',
      email: 'admin@production.com',
      password: 'admin123',
      role: 'admin'
    }
  },
  {
    dbName: 'secure-data-test',
    adminUser: {
      name: 'Test Admin',
      username: 'testadmin',
      email: 'admin@test.com',
      password: 'test123',
      role: 'admin'
    }
  },
  {
    dbName: 'secure-data-demo',
    adminUser: {
      name: 'Demo Admin',
      username: 'demoadmin',
      email: 'admin@demo.com',
      password: 'demo123',
      role: 'admin'
    }
  }
];

async function setupEnvironment(env) {
  try {
    const uri = `mongodb+srv://jayakumarveeran09:fnXZTDCJRovKeQXQ@cluster0.sqj1i.mongodb.net/${env.dbName}`;
    console.log(`\nSetting up ${env.dbName}...`);
    
    await mongoose.connect(uri);
    console.log(`Connected to ${env.dbName}`);

    // Check if admin user exists
    const existingAdmin = await User.findOne({ username: env.adminUser.username });
    
    if (existingAdmin) {
      console.log(`Admin user already exists in ${env.dbName}`);
    } else {
      // Create admin user
      const adminUser = new User(env.adminUser);
      await adminUser.save();
      console.log(`Created admin user in ${env.dbName}`);
    }

    // Verify connection and data
    const users = await User.find({});
    console.log(`Total users in ${env.dbName}: ${users.length}`);
    
    await mongoose.connection.close();
    console.log(`Closed connection to ${env.dbName}`);
  } catch (error) {
    console.error(`Error setting up ${env.dbName}:`, error);
  }
}

async function setupAllEnvironments() {
  console.log('Starting database setup...');
  
  for (const env of environments) {
    await setupEnvironment(env);
  }
  
  console.log('\nDatabase setup completed!');
  console.log('\nAccess credentials for each environment:');
  environments.forEach(env => {
    console.log(`\n${env.dbName}:`);
    console.log(`Username: ${env.adminUser.username}`);
    console.log(`Password: ${env.adminUser.password}`);
  });
  
  process.exit(0);
}

setupAllEnvironments(); 