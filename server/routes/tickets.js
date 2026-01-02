import express from 'express';
import Ticket from '../models/Ticket.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/tickets
// @desc    Get all tickets
// @access  Private
router.get('/', authenticateToken, async (req, res) => {
  try {
    const tickets = await Ticket.find().sort({ createdAt: -1 });
    res.json(tickets);
  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/tickets/:id
// @desc    Get ticket by ID
// @access  Private
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const ticket = await Ticket.findOne({ id: req.params.id });
    
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    res.json(ticket);
  } catch (error) {
    console.error('Error fetching ticket:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/tickets
// @desc    Create new ticket
// @access  Private
router.post('/', authenticateToken, async (req, res) => {
  try {
    const ticketData = req.body;
    
    // Generate ID if not provided
    if (!ticketData.id) {
      const count = await Ticket.countDocuments();
      ticketData.id = `TKT-${Date.now()}-${count + 1}`;
    }
    
    const ticket = new Ticket(ticketData);
    await ticket.save();
    
    res.status(201).json(ticket);
  } catch (error) {
    console.error('Error creating ticket:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// @route   PUT /api/tickets/:id
// @desc    Update ticket
// @access  Private
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const ticket = await Ticket.findOneAndUpdate(
      { id: req.params.id },
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    res.json(ticket);
  } catch (error) {
    console.error('Error updating ticket:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   DELETE /api/tickets/:id
// @desc    Delete ticket
// @access  Private
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const ticket = await Ticket.findOneAndDelete({ id: req.params.id });
    
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    res.json({ message: 'Ticket deleted successfully' });
  } catch (error) {
    console.error('Error deleting ticket:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
