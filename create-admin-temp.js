const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

mongoose.connect('mongodb://localhost:27017/itam_system');

const userSchema = new mongoose.Schema({
  id: String,
  name: String,
  email: String,
  password: String,
  roles: [String],
  branches: [String],
  isActive: Boolean,
  lastLogin: String,
  isMfaEnabled: Boolean
});

const User = mongoose.model('User', userSchema);

async function run() {
  const hash = await bcrypt.hash('admin', 10);
  await User.create({
    id: 'USR-ADMIN-001',
    name: 'مدير النظام',
    email: 'admin@company.com',
    password: hash,
    roles: ['Super Admin'],
    branches: [],
    isActive: true,
    isMfaEnabled: false
  });
  console.log('Admin created!');
  process.exit(0);
}
run();
