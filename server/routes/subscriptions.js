import express from 'express';
import Subscription from '../models/Subscription.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/subscriptions
// @desc    Get all subscriptions
// @access  Private
router.get('/', authenticateToken, async (req, res) => {
  try {
    const subscriptions = await Subscription.find().sort({ createdAt: -1 });
    res.json(subscriptions);
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/subscriptions/:id
// @desc    Get subscription by ID
// @access  Private
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const subscription = await Subscription.findOne({ id: req.params.id });
    
    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }
    
    res.json(subscription);
  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/subscriptions
// @desc    Create new subscription
// @access  Private
router.post('/', authenticateToken, async (req, res) => {
  try {
    const subscriptionData = req.body;
    
    // Generate ID if not provided
    if (!subscriptionData.id) {
      const count = await Subscription.countDocuments();
      subscriptionData.id = `SUB-${Date.now()}-${count + 1}`;
    }
    
    const subscription = new Subscription(subscriptionData);
    await subscription.save();
    
    res.status(201).json(subscription);
  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// @route   PUT /api/subscriptions/:id
// @desc    Update subscription
// @access  Private
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const subscription = await Subscription.findOneAndUpdate(
      { id: req.params.id },
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }
    
    res.json(subscription);
  } catch (error) {
    console.error('Error updating subscription:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   DELETE /api/subscriptions/:id
// @desc    Delete subscription
// @access  Private
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const subscription = await Subscription.findOneAndDelete({ id: req.params.id });
    
    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }
    
    res.json({ message: 'Subscription deleted successfully' });
  } catch (error) {
    console.error('Error deleting subscription:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
