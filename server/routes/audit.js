import express from 'express';
import Audit from '../models/Audit.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/audit
// @desc    Get all audit logs
// @access  Private
router.get('/', authenticateToken, async (req, res) => {
  try {
    const logs = await Audit.find().sort({ timestamp: -1 }).limit(100);
    res.json(logs);
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/audit/:id
// @desc    Get audit log by ID
// @access  Private
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const log = await Audit.findOne({ id: req.params.id });
    
    if (!log) {
      return res.status(404).json({ error: 'Audit log not found' });
    }
    
    res.json(log);
  } catch (error) {
    console.error('Error fetching audit log:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/audit
// @desc    Create new audit log
// @access  Private
router.post('/', authenticateToken, async (req, res) => {
  try {
    const logData = req.body;
    
    // Generate ID if not provided
    if (!logData.id) {
      const count = await Audit.countDocuments();
      logData.id = `AUD-${Date.now()}-${count + 1}`;
    }
    
    const log = new Audit(logData);
    await log.save();
    
    res.status(201).json(log);
  } catch (error) {
    console.error('Error creating audit log:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

export default router;
