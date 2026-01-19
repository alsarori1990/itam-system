import express from 'express';
import Ticket from '../models/Ticket.js';
import User from '../models/User.js';
import { authenticateToken } from '../middleware/auth.js';
import emailService from '../services/emailService.js';
import notificationService from '../services/notificationService.js';
import cacheService from '../services/cacheService.js';

const router = express.Router();

// @route   POST /api/tickets/public
// @desc    Create new ticket from public portal
// @access  Public (no authentication required)
router.post('/public', async (req, res) => {
  try {
    const ticketData = req.body;
    console.log('🔍 Public ticket data received:', JSON.stringify(ticketData, null, 2));
    
    // Translate priority from English to Arabic if needed
    const priorityMap = {
      'Low': 'منخفض',
      'Medium': 'متوسط', 
      'High': 'عالي',
      'Critical': 'حرج',
      'Normal': 'متوسط'
    };
    
    if (ticketData.priority && priorityMap[ticketData.priority]) {
      ticketData.priority = priorityMap[ticketData.priority];
    } else if (!ticketData.priority) {
      ticketData.priority = 'متوسط';
    }
    
    console.log('📝 Priority after mapping:', ticketData.priority);
    
    // Add required fields
    ticketData.channel = 'Portal';
    ticketData.category = ticketData.category || 'أخرى';
    ticketData.status = 'جديد';
    ticketData.receivedAt = new Date();
    ticketData.assignedTo = '';
    ticketData.branch = ticketData.branch || 'غير محدد';
    
    const timestamp = Date.now();
    const randomSuffix = Math.floor(Math.random() * 1000);
    ticketData.id = `TKT-PUB-${timestamp}-${randomSuffix}`;
    
    console.log('📦 Final ticket data:', JSON.stringify(ticketData, null, 2));
    
    const ticket = new Ticket(ticketData);
    await ticket.save();
    
    // Invalidate tickets cache
    cacheService.invalidatePattern('^tickets:');
    
    console.log('📧 New ticket created from public portal:', ticket.id);
    
    // Send email notification using new notification system
    notificationService.trigger('TICKET_CREATED', {
      ticket_id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      requester_name: ticket.requesterName || 'عميل',
      requester_email: ticket.requesterEmail,
      description: ticket.description,
      priority: ticket.priority || 'متوسط',
      branch: ticket.branch || 'غير محدد',
      phone: ticket.phone || ''
    }).catch(err => console.error('Failed to trigger TICKET_CREATED notification:', err));
    
    res.status(201).json(ticket);
  } catch (error) {
    console.error('Error creating public ticket:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// @route   GET /api/tickets
// @desc    Get all tickets with pagination and filtering
// @access  Private
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50; // Default 50 tickets per page
    const skip = (page - 1) * limit;
    
    // Build filter query
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.priority) filter.priority = req.query.priority;
    if (req.query.assignedTo) filter.assignedTo = req.query.assignedTo;
    if (req.query.category) filter.category = req.query.category;
    if (req.query.channel) filter.channel = req.query.channel;
    
    // Search functionality
    if (req.query.search) {
      filter.$or = [
        { id: { $regex: req.query.search, $options: 'i' } },
        { requesterName: { $regex: req.query.search, $options: 'i' } },
        { description: { $regex: req.query.search, $options: 'i' } }
      ];
    }
    
    // Create cache key
    const cacheKey = `tickets:${page}:${limit}:${JSON.stringify(filter)}`;
    
    // Check cache first (only for simple queries, not search)
    if (!req.query.search) {
      const cached = cacheService.get(cacheKey);
      if (cached) {
        return res.json(cached);
      }
    }
    
    // Get total count for pagination
    const total = await Ticket.countDocuments(filter);
    
    // Fetch tickets with lean() for better performance (returns plain JS objects)
    const tickets = await Ticket.find(filter)
      .select('-__v -escalationHistory') // Exclude only heavy fields, keep description and title
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(); // Much faster than Mongoose documents
    
    const response = {
      tickets,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasMore: skip + tickets.length < total
      }
    };
    
    // Cache for 30 seconds
    if (!req.query.search) {
      cacheService.set(cacheKey, response, 30);
    }
    
    res.json(response);
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
// @desc    Create new ticket (authenticated users from inside system)
// @access  Private
router.post('/', authenticateToken, async (req, res) => {
  try {
    const ticketData = req.body;
    
    // Always generate ID on backend to avoid conflicts
    if (!ticketData.id) {
      const year = new Date().getFullYear().toString().substr(-2);
      const timestamp = Date.now();
      const randomSuffix = Math.floor(Math.random() * 1000);
      ticketData.id = `TKT-${year}-${String(randomSuffix).padStart(3, '0')}`;
    }
    
    // Auto-assign to Support Staff if not already assigned
    if (!ticketData.assignedTo || ticketData.assignedTo === '') {
      try {
        // Find Support Staff users in the same branch (if branch specified)
        const query = {
          supportLevel: 'موظف دعم فني',
          isActive: true
        };
        
        if (ticketData.branch) {
          query.branches = ticketData.branch;
        }
        
        const supportStaff = await User.find(query);
        
        if (supportStaff.length > 0) {
          // Find the Support Staff member with the fewest open tickets
          const userTicketCounts = await Promise.all(
            supportStaff.map(async (user) => {
              const count = await Ticket.countDocuments({
                assignedTo: user.name,
                status: { $nin: ['تم الحل', 'مغلقة'] }
              });
              return { user, count };
            })
          );
          
          // Sort by count and pick first (least loaded)
          userTicketCounts.sort((a, b) => a.count - b.count);
          const assignedUser = userTicketCounts[0].user;
          
          ticketData.assignedTo = assignedUser.name;
          ticketData.status = 'تم التعيين';
          
          // Add auto-assignment to escalation history
          ticketData.escalationHistory = [{
            id: `AUTO-${Date.now()}`,
            timestamp: new Date(),
            fromUser: 'النظام',
            toUser: assignedUser.name,
            action: 'AUTO_ASSIGN',
            reason: 'إسناد تلقائي للتذكرة الجديدة',
            fromLevel: null,
            toLevel: assignedUser.supportLevel
          }];
          
          // Send notification email if configured
          if (emailService.isConfigured() && assignedUser.email) {
            setTimeout(() => {
              emailService.sendAssignmentNotification(ticketData, assignedUser).catch(err => {
                console.error('Failed to send assignment email:', err);
              });
            }, 100);
          }
          
          // Trigger new notification system
          notificationService.trigger('TICKET_ASSIGNED', {
            ticket: { ...ticketData, assignedTo: assignedUser },
            assignedTo: assignedUser
          }).catch(err => console.error('Notification trigger failed:', err));
        }
      } catch (autoAssignError) {
        console.error('Auto-assignment failed:', autoAssignError);
        // Continue creating ticket even if auto-assignment fails
      }
    }
    
    const ticket = new Ticket(ticketData);
    await ticket.save();
    
    // Invalidate tickets cache
    cacheService.invalidatePattern('^tickets:');
    
    // Trigger creation event
    notificationService.trigger('TICKET_CREATED', { ticket }).catch(err => 
      console.error('Notification trigger failed:', err)
    );
    
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
// @desc    Delete ticket with all related files and records
// @access  Private
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const ticket = await Ticket.findOne({ id: req.params.id });
    
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    console.log(`🗑️  Deleting ticket ${ticket.id} with all related data...`);
    
    // 1. Delete attachment images from filesystem
    if (ticket.attachmentImage) {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      try {
        const imagePath = path.join(process.cwd(), ticket.attachmentImage);
        await fs.unlink(imagePath);
        console.log(`  ✅ Deleted image: ${ticket.attachmentImage}`);
      } catch (err) {
        console.warn(`  ⚠️  Could not delete image ${ticket.attachmentImage}:`, err.message);
      }
    }
    
    // 2. Delete associated InboundEmail and its attachments
    if (ticket.sourceEmailId) {
      const InboundEmail = (await import('../models/InboundEmail.js')).default;
      const inboundEmail = await InboundEmail.findById(ticket.sourceEmailId);
      
      if (inboundEmail && inboundEmail.attachments) {
        const fs = await import('fs/promises');
        const path = await import('path');
        
        for (const attachment of inboundEmail.attachments) {
          if (attachment.storedPath) {
            try {
              const attachPath = path.join(process.cwd(), attachment.storedPath);
              await fs.unlink(attachPath);
              console.log(`  ✅ Deleted attachment: ${attachment.storedPath}`);
            } catch (err) {
              console.warn(`  ⚠️  Could not delete attachment ${attachment.storedPath}:`, err.message);
            }
          }
        }
        
        // Delete the InboundEmail record
        await InboundEmail.findByIdAndDelete(ticket.sourceEmailId);
        console.log(`  ✅ Deleted InboundEmail record: ${ticket.sourceEmailId}`);
      }
    }
    
    // 3. Delete associated EmailThread
    const EmailThread = (await import('../models/EmailThread.js')).default;
    const threadResult = await EmailThread.deleteMany({ ticketId: ticket.id });
    if (threadResult.deletedCount > 0) {
      console.log(`  ✅ Deleted ${threadResult.deletedCount} EmailThread record(s)`);
    }
    
    // 4. Delete associated Audit logs
    const Audit = (await import('../models/Audit.js')).default;
    const auditResult = await Audit.deleteMany({ 
      $or: [
        { targetType: 'Ticket', targetId: ticket.id },
        { details: new RegExp(ticket.id, 'i') }
      ]
    });
    if (auditResult.deletedCount > 0) {
      console.log(`  ✅ Deleted ${auditResult.deletedCount} Audit log(s)`);
    }
    
    // 5. Finally, delete the ticket itself
    await Ticket.findOneAndDelete({ id: req.params.id });
    console.log(`  ✅ Deleted ticket record: ${ticket.id}`);
    
    // Invalidate cache
    cacheService.invalidatePattern('^tickets:');
    
    console.log(`✅ Successfully deleted ticket ${ticket.id} with all related data`);
    res.json({ 
      message: 'Ticket deleted successfully with all attachments and related records',
      deletedItems: {
        ticket: true,
        attachmentImage: !!ticket.attachmentImage,
        inboundEmail: !!ticket.sourceEmailId,
        emailThreads: threadResult.deletedCount,
        auditLogs: auditResult.deletedCount
      }
    });
  } catch (error) {
    console.error('Error deleting ticket:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   DELETE /api/tickets/bulk/all
// @desc    Delete ALL tickets with complete cleanup (admin only)
// @access  Private
router.delete('/bulk/all', authenticateToken, async (req, res) => {
  try {
    // Count tickets before deletion
    const count = await Ticket.countDocuments();
    
    if (count === 0) {
      return res.json({ message: 'No tickets to delete', deletedCount: 0 });
    }
    
    console.log(`🗑️  Admin ${req.user.name || req.user.email} is deleting ALL ${count} tickets with complete cleanup...`);
    
    // Get all tickets to process their attachments
    const allTickets = await Ticket.find({}).lean();
    
    let deletedImages = 0;
    let deletedAttachments = 0;
    let deletedInboundEmails = 0;
    
    const fs = await import('fs/promises');
    const path = await import('path');
    const InboundEmail = (await import('../models/InboundEmail.js')).default;
    
    // Process each ticket for cleanup
    for (const ticket of allTickets) {
      // Delete attachment images
      if (ticket.attachmentImage) {
        try {
          const imagePath = path.join(process.cwd(), ticket.attachmentImage);
          await fs.unlink(imagePath);
          deletedImages++;
        } catch (err) {
          console.warn(`  ⚠️  Could not delete image ${ticket.attachmentImage}:`, err.message);
        }
      }
      
      // Delete InboundEmail attachments
      if (ticket.sourceEmailId) {
        try {
          const inboundEmail = await InboundEmail.findById(ticket.sourceEmailId);
          
          if (inboundEmail && inboundEmail.attachments) {
            for (const attachment of inboundEmail.attachments) {
              if (attachment.storedPath) {
                try {
                  const attachPath = path.join(process.cwd(), attachment.storedPath);
                  await fs.unlink(attachPath);
                  deletedAttachments++;
                } catch (err) {
                  console.warn(`  ⚠️  Could not delete attachment ${attachment.storedPath}:`, err.message);
                }
              }
            }
          }
          
          deletedInboundEmails++;
        } catch (err) {
          console.warn(`  ⚠️  Error processing InboundEmail ${ticket.sourceEmailId}:`, err.message);
        }
      }
    }
    
    // Delete all InboundEmails
    const inboundResult = await InboundEmail.deleteMany({});
    
    // Delete all EmailThreads
    const EmailThread = (await import('../models/EmailThread.js')).default;
    const threadResult = await EmailThread.deleteMany({});
    
    // Delete all related Audit logs
    const Audit = (await import('../models/Audit.js')).default;
    const auditResult = await Audit.deleteMany({ targetType: 'Ticket' });
    
    // Finally, delete all tickets
    const result = await Ticket.deleteMany({});
    
    // Invalidate all cache
    cacheService.clear();
    
    console.log(`✅ Bulk deletion complete:
      - Tickets: ${result.deletedCount}
      - Images: ${deletedImages}
      - Attachments: ${deletedAttachments}
      - InboundEmails: ${inboundResult.deletedCount}
      - EmailThreads: ${threadResult.deletedCount}
      - Audit logs: ${auditResult.deletedCount}`);
    
    res.json({ 
      message: `Successfully deleted ${result.deletedCount} tickets with all related data`,
      deletedCount: result.deletedCount,
      cleanup: {
        tickets: result.deletedCount,
        images: deletedImages,
        attachments: deletedAttachments,
        inboundEmails: inboundResult.deletedCount,
        emailThreads: threadResult.deletedCount,
        auditLogs: auditResult.deletedCount
      }
    });
  } catch (error) {
    console.error('Error deleting all tickets:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/tickets/:id/escalate
// @desc    Escalate ticket to next support level
// @access  Private
router.post('/:id/escalate', authenticateToken, async (req, res) => {
  try {
    const { reason } = req.body;
    
    if (!reason || reason.trim() === '') {
      return res.status(400).json({ error: 'سبب التصعيد مطلوب' });
    }
    
    const ticket = await Ticket.findOne({ id: req.params.id });
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    // req.user is the full user object from auth middleware
    const currentUser = req.user;
    if (!currentUser || !currentUser.supportLevel) {
      return res.status(400).json({ error: 'مستوى الدعم غير محدد للمستخدم' });
    }
    
    // Determine next level
    let nextLevel;
    if (currentUser.supportLevel === 'موظف دعم فني') {
      nextLevel = 'أخصائي تقنية المعلومات';
    } else if (currentUser.supportLevel === 'أخصائي تقنية المعلومات') {
      nextLevel = 'مشرف وحدة تقنية المعلومات';
    } else {
      return res.status(400).json({ error: 'لا يمكن التصعيد من هذا المستوى' });
    }
    
    // Find available user at next level (prefer same branch or global, least loaded)
    const nextLevelUsers = await User.find({
      supportLevel: nextLevel,
      isActive: true,
      $or: [
        { branches: ticket.branch },
        { branches: [] },  // Global users (no specific branches)
        { branches: { $exists: false } }  // Users without branches field
      ]
    });
    
    if (nextLevelUsers.length === 0) {
      // Fallback: any user at next level
      const fallbackUsers = await User.find({
        supportLevel: nextLevel,
        isActive: true
      });
      
      if (fallbackUsers.length === 0) {
        return res.status(400).json({ error: `لا يوجد مستخدمين من مستوى ${nextLevel}` });
      }
      
      nextLevelUsers.push(...fallbackUsers);
    }
    
    // Get ticket counts for each user to find least loaded
    const userTicketCounts = await Promise.all(
      nextLevelUsers.map(async (user) => {
        const count = await Ticket.countDocuments({
          assignedTo: user.name,
          status: { $nin: ['تم الحل', 'مغلقة'] }
        });
        return { user, count };
      })
    );
    
    // Sort by count and pick first (least loaded)
    userTicketCounts.sort((a, b) => a.count - b.count);
    const targetUser = userTicketCounts[0].user;
    
    // Update ticket
    ticket.assignedTo = targetUser.name;
    ticket.status = 'مصعّد';
    
    // Add escalation record
    if (!ticket.escalationHistory) {
      ticket.escalationHistory = [];
    }
    
    ticket.escalationHistory.push({
      id: `ESC-${Date.now()}`,
      timestamp: new Date(),
      fromUser: currentUser.name,
      toUser: targetUser.name,
      action: 'ESCALATE',
      reason: reason,
      fromLevel: currentUser.supportLevel,
      toLevel: targetUser.supportLevel
    });
    
    await ticket.save();
    
    // Send notification email if configured (non-blocking with timeout)
    if (emailService.isConfigured() && targetUser.email) {
      Promise.race([
        emailService.sendEscalationNotification(ticket, targetUser, currentUser, reason),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Email timeout')), 3000))
      ]).catch(err => {
        console.error('Failed to send escalation email:', err.message);
      });
    }
    
    // Trigger escalation notification
    notificationService.trigger('TICKET_ESCALATED', {
      ticket,
      escalatedTo: targetUser,
      escalatedBy: currentUser,
      escalationReason: reason
    }).catch(err => console.error('Notification trigger failed:', err));
    
    res.json(ticket);
  } catch (error) {
    console.error('Error escalating ticket:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// @route   POST /api/tickets/:id/reassign
// @desc    Reassign ticket to specific user (Supervisor only)
// @access  Private
router.post('/:id/reassign', authenticateToken, async (req, res) => {
  try {
    const { targetUserId, instructions } = req.body;
    
    if (!targetUserId || !instructions || instructions.trim() === '') {
      return res.status(400).json({ error: 'المستخدم المستهدف والتعليمات مطلوبة' });
    }
    
    const ticket = await Ticket.findOne({ id: req.params.id });
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    // req.user is the full user object from auth middleware
    const currentUser = req.user;
    if (!currentUser || !currentUser.supportLevel) {
      return res.status(403).json({ error: 'يجب أن يكون لديك مستوى دعم فني لإعادة الإسناد' });
    }
    
    // Get target user
    const targetUser = await User.findOne({ id: targetUserId, isActive: true });
    if (!targetUser) {
      return res.status(404).json({ error: 'المستخدم المستهدف غير موجود أو غير نشط' });
    }
    
    // Define hierarchy levels
    const hierarchy = {
      'موظف دعم فني': 1,
      'أخصائي تقنية المعلومات': 2,
      'مشرف وحدة تقنية المعلومات': 3
    };
    
    const currentLevel = hierarchy[currentUser.supportLevel] || 0;
    const targetLevel = hierarchy[targetUser.supportLevel] || 0;
    
    // Can only reassign to same level or lower
    if (targetLevel > currentLevel) {
      return res.status(403).json({ error: 'يمكنك فقط إعادة الإسناد لنفس مستواك أو أقل' });
    }
    
    // Update ticket
    ticket.assignedTo = targetUser.name;
    ticket.status = 'تم التعيين';
    
    // Add reassignment record
    if (!ticket.escalationHistory) {
      ticket.escalationHistory = [];
    }
    
    ticket.escalationHistory.push({
      id: `REASN-${Date.now()}`,
      timestamp: new Date(),
      fromUser: currentUser.name,
      toUser: targetUser.name,
      action: 'REASSIGN',
      reason: instructions,
      fromLevel: currentUser.supportLevel,
      toLevel: targetUser.supportLevel
    });
    
    await ticket.save();
    
    // Send notification email if configured (non-blocking with timeout)
    if (emailService.isConfigured() && targetUser.email) {
      Promise.race([
        emailService.sendReassignNotification(ticket, targetUser, currentUser, instructions),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Email timeout')), 3000))
      ]).catch(err => {
        console.error('Failed to send reassignment email:', err.message);
      });
    }
    
    // Trigger reassignment notification
    notificationService.trigger('TICKET_REASSIGNED', {
      ticket,
      assignedTo: targetUser,
      reassignedBy: currentUser,
      instructions
    }).catch(err => console.error('Notification trigger failed:', err));
    
    res.json(ticket);
  } catch (error) {
    console.error('Error reassigning ticket:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

export default router;
