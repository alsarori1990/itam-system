// Script to create admin user in MongoDB
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/itam_system')
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// User Schema
const userSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  roles: [{ type: String, enum: ['Super Admin', 'IT Manager', 'Technician', 'Auditor', 'Viewer', 'User'] }],
  branches: [String],
  isActive: { type: Boolean, default: true },
  lastLogin: String,
  isMfaEnabled: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

async function createAdminUser() {
  try {
    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@company.com' });
    
    if (existingAdmin) {
      console.log('⚠️ Admin user already exists');
      console.log('📧 Email: admin@company.com');
      console.log('🔑 Password: admin');
      process.exit(0);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('admin', 10);

    // Create admin user
    const adminUser = new User({
      id: 'USR-ADMIN-001',
      name: 'مدير النظام',
      email: 'admin@company.com',
      password: hashedPassword,
      roles: ['Super Admin'],
      branches: [],
      isActive: true,
      lastLogin: new Date().toISOString(),
      isMfaEnabled: false
    });

    await adminUser.save();
    
    console.log('✅ Admin user created successfully!');
    console.log('📧 Email: admin@company.com');
    console.log('🔑 Password: admin');
    console.log('👤 Name: مدير النظام');
    console.log('🎯 Role: Super Admin');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    process.exit(1);
  }
}

// Run the function
createAdminUser();
