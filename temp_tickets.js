const router = express.Router();

// @route   POST /api/tickets/public
// @desc    Create new ticket from public portal
// @access  Public (no authentication)
router.post('/public', async (req, res) => {
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
    console.error('Error creating public ticket:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// @route   GET /api/tickets
