import express from 'express';
import SimCard from '../models/SimCard.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/simcards
// @desc    Get all SIM cards
// @access  Private
router.get('/', authenticateToken, async (req, res) => {
  try {
    const simCards = await SimCard.find().sort({ createdAt: -1 });
    res.json(simCards);
  } catch (error) {
    console.error('Error fetching SIM cards:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/simcards/:id
// @desc    Get SIM card by ID
// @access  Private
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const simCard = await SimCard.findOne({ id: req.params.id });
    
    if (!simCard) {
      return res.status(404).json({ error: 'SIM card not found' });
    }
    
    res.json(simCard);
  } catch (error) {
    console.error('Error fetching SIM card:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/simcards
// @desc    Create new SIM card
// @access  Private
router.post('/', authenticateToken, async (req, res) => {
  try {
    const simCardData = req.body;
    
    // Generate ID if not provided
    if (!simCardData.id) {
      const count = await SimCard.countDocuments();
      simCardData.id = `SIM-${Date.now()}-${count + 1}`;
    }
    
    const simCard = new SimCard(simCardData);
    await simCard.save();
    
    res.status(201).json(simCard);
  } catch (error) {
    console.error('Error creating SIM card:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// @route   PUT /api/simcards/:id
// @desc    Update SIM card
// @access  Private
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const simCard = await SimCard.findOneAndUpdate(
      { id: req.params.id },
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!simCard) {
      return res.status(404).json({ error: 'SIM card not found' });
    }
    
    res.json(simCard);
  } catch (error) {
    console.error('Error updating SIM card:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   DELETE /api/simcards/:id
// @desc    Delete SIM card
// @access  Private
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const simCard = await SimCard.findOneAndDelete({ id: req.params.id });
    
    if (!simCard) {
      return res.status(404).json({ error: 'SIM card not found' });
    }
    
    res.json({ message: 'SIM card deleted successfully' });
  } catch (error) {
    console.error('Error deleting SIM card:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
