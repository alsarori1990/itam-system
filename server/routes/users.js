import express from 'express';
import User from '../models/User.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Generate unique user ID
function generateUserId() {
  const timestamp = Date.now().toString().slice(-7);
  const random = Math.floor(Math.random() * 1000);
  return `USR-${timestamp}${random}`;
}

// @route   GET /api/users
// @desc    Get all users
// @access  Private
router.get('/', authenticateToken, async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Private
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const user = await User.findOne({ id: req.params.id }).select('-password');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/users
// @desc    Create new user
// @access  Private
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, email, password, roles, branches, isActive } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    // Generate unique ID
    const id = generateUserId();
    
    // Create new user
    const user = new User({
      id,
      name,
      email,
      password,
      roles: roles || ['User'],
      branches: branches || [],
      isActive: isActive !== undefined ? isActive : true
    });
    
    await user.save();
    
    // Return user without password
    const userResponse = user.toObject();
    delete userResponse.password;
    
    res.status(201).json(userResponse);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// @route   PUT /api/users/:id
// @desc    Update user
// @access  Private
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { name, email, roles, branches, isActive, password } = req.body;
    
    const user = await User.findOne({ id: req.params.id });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Update fields
    if (name) user.name = name;
    if (email) user.email = email;
    if (roles) user.roles = roles;
    if (branches) user.branches = branches;
    if (isActive !== undefined) user.isActive = isActive;
    if (password) user.password = password;
    
    await user.save();
    
    // Return user without password
    const userResponse = user.toObject();
    delete userResponse.password;
    
    res.json(userResponse);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   DELETE /api/users/:id
// @desc    Delete user
// @access  Private
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const user = await User.findOneAndDelete({ id: req.params.id });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
