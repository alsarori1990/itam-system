import express from 'express';
import Config from '../models/Config.js';
import emailService from '../services/emailService.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/config/smtp
// @desc    Get SMTP settings
// @access  Private
router.get('/smtp', authenticateToken, async (req, res) => {
  try {
    const config = await Config.findOne({ key: 'smtp_settings' });
    
    if (!config) {
      return res.json({
        enabled: false,
        host: '',
        port: '587',
        user: '',
        pass: '',
        fromEmail: '',
        adminEmails: ''
      });
    }
    
    // Don't send password to frontend
    const settings = { ...config.value };
    settings.pass = settings.pass ? '********' : '';
    
    res.json(settings);
  } catch (error) {
    console.error('Error fetching SMTP settings:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/config/smtp
// @desc    Update SMTP settings
// @access  Private
router.post('/smtp', authenticateToken, async (req, res) => {
  try {
    const { enabled, host, port, user, pass, fromEmail, adminEmails } = req.body;
    
    // Validation
    if (enabled) {
      if (!host || !port || !user || !fromEmail) {
        return res.status(400).json({ 
          error: 'جميع الحقول مطلوبة عند تفعيل البريد الإلكتروني' 
        });
      }
    }
    
    // Get existing settings to preserve password if not changed
    let finalPass = pass;
    if (pass === '********' || !pass) {
      const existingConfig = await Config.findOne({ key: 'smtp_settings' });
      if (existingConfig && existingConfig.value.pass) {
        finalPass = existingConfig.value.pass;
      }
    }
    
    const settings = {
      enabled,
      host,
      port,
      user,
      pass: finalPass,
      fromEmail,
      adminEmails: adminEmails || ''
    };
    
    // Save to database
    await Config.findOneAndUpdate(
      { key: 'smtp_settings' },
      { 
        value: settings,
        updatedBy: req.user?.email || 'admin',
        updatedAt: new Date()
      },
      { upsert: true, new: true }
    );
    
    // Configure email service
    if (enabled) {
      emailService.configure(settings);
    } else {
      emailService.configure({ enabled: false });
    }
    
    // Return settings without password
    const responseSettings = { ...settings };
    responseSettings.pass = responseSettings.pass ? '********' : '';
    
    res.json({ 
      message: 'تم حفظ إعدادات البريد الإلكتروني بنجاح',
      settings: responseSettings
    });
  } catch (error) {
    console.error('Error updating SMTP settings:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/config/smtp/test
// @desc    Test SMTP connection
// @access  Private
router.post('/smtp/test', authenticateToken, async (req, res) => {
  try {
    const { testEmail } = req.body;
    
    if (!emailService.isConfigured()) {
      return res.status(400).json({ 
        error: 'البريد الإلكتروني غير مفعّل. يرجى حفظ الإعدادات أولاً.' 
      });
    }
    
    // Test connection
    await emailService.testConnection();
    
    // Send test email
    const emailTo = testEmail || req.user?.email || 'admin@company.com';
    await emailService.sendMail({
      to: emailTo,
      subject: '✅ اختبار نظام البريد الإلكتروني',
      text: `
هذه رسالة اختبار من نظام ITAM.

إذا وصلتك هذه الرسالة، فإن إعدادات SMTP تعمل بشكل صحيح!

التاريخ: ${new Date().toLocaleString('ar-SA')}
      `.trim()
    });
    
    res.json({ 
      success: true,
      message: `تم إرسال بريد اختبار إلى ${emailTo}. يرجى التحقق من صندوق الوارد.`
    });
  } catch (error) {
    console.error('SMTP test failed:', error);
    res.status(500).json({ 
      error: 'فشل الاتصال بخادم SMTP: ' + error.message 
    });
  }
});

export default router;
