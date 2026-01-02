import express from 'express';
import Report from '../models/Report.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/reports
// @desc    Get all reports
// @access  Private
router.get('/', authenticateToken, async (req, res) => {
  try {
    const reports = await Report.find().sort({ createdAt: -1 });
    res.json(reports);
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/reports/:id
// @desc    Get report by ID
// @access  Private
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const report = await Report.findOne({ id: req.params.id });
    
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    res.json(report);
  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/reports
// @desc    Create new report
// @access  Private
router.post('/', authenticateToken, async (req, res) => {
  try {
    const reportData = req.body;
    
    // Generate ID if not provided
    if (!reportData.id) {
      const count = await Report.countDocuments();
      reportData.id = `RPT-${Date.now()}-${count + 1}`;
    }
    
    const report = new Report(reportData);
    await report.save();
    
    res.status(201).json(report);
  } catch (error) {
    console.error('Error creating report:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// @route   PUT /api/reports/:id
// @desc    Update report
// @access  Private
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const report = await Report.findOneAndUpdate(
      { id: req.params.id },
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    res.json(report);
  } catch (error) {
    console.error('Error updating report:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   DELETE /api/reports/:id
// @desc    Delete report
// @access  Private
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const report = await Report.findOneAndDelete({ id: req.params.id });
    
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    res.json({ message: 'Report deleted successfully' });
  } catch (error) {
    console.error('Error deleting report:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
