import nodemailer from 'nodemailer';

class EmailService {
  constructor() {
    this.transporter = null;
    this.settings = null;
  }

  // تهيئة SMTP بناءً على الإعدادات
  configure(settings) {
    if (!settings || !settings.enabled) {
      this.transporter = null;
      this.settings = null;
      return false;
    }

    try {
      this.settings = settings;
      
      // Special config for different email providers
      const isOffice365 = settings.host && settings.host.includes('office365');
      const isGoDaddy = settings.host && settings.host.includes('secureserver');
      
      let transportConfig = {
        host: settings.host,
        port: parseInt(settings.port),
        secure: parseInt(settings.port) === 465, // true for 465, false for other ports
        auth: {
          user: settings.user,
          pass: settings.pass,
        },
        connectionTimeout: 60000, // 60 seconds
        greetingTimeout: 30000,   // 30 seconds
        socketTimeout: 60000,     // 60 seconds
        tls: {
          rejectUnauthorized: false, // More permissive
          minVersion: 'TLSv1.2'
        }
      };
      
      // GoDaddy specific settings
      if (isGoDaddy) {
        transportConfig.authMethod = 'PLAIN';
        transportConfig.auth.type = 'login';
        delete transportConfig.requireTLS;
      }
      
      // Office 365 specific settings
      if (isOffice365) {
        transportConfig.authMethod = 'LOGIN';
        transportConfig.requireTLS = false;
        transportConfig.tls.ciphers = 'SSLv3';
      }
      
      this.transporter = nodemailer.createTransport(transportConfig);
      
      console.log('✅ Email service configured successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to configure email service:', error);
      this.transporter = null;
      this.settings = null;
      return false;
    }
  }

  // اختبار الاتصال
  async testConnection() {
    if (!this.transporter) {
      throw new Error('Email service not configured');
    }

    try {
      await this.transporter.verify();
      console.log('✅ SMTP connection verified');
      return true;
    } catch (error) {
      console.error('❌ SMTP connection failed:', error);
      throw error;
    }
  }

  // إرسال بريد إلكتروني
  async sendMail({ to, subject, text, html }) {
    if (!this.transporter || !this.settings) {
      console.log('⚠️ Email service not configured, email not sent');
      return false;
    }

    try {
      const mailOptions = {
        from: `"${this.settings.fromName || 'نظام ITAM'}" <${this.settings.fromEmail}>`,
        to,
        subject,
        text,
        html: html || this.generateHtmlTemplate(text, subject)
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ Email sent successfully:', info.messageId);
      return true;
    } catch (error) {
      console.error('❌ Failed to send email:', error);
      return false;
    }
  }

  // إرسال بريد للمسؤولين
  async sendToAdmins({ subject, text, html }) {
    if (!this.settings || !this.settings.adminEmails) {
      console.log('⚠️ No admin emails configured');
      return false;
    }

    const adminEmails = this.settings.adminEmails.split(',').map(email => email.trim());
    const promises = adminEmails.map(email => 
      this.sendMail({ to: email, subject, text, html })
    );

    try {
      await Promise.all(promises);
      return true;
    } catch (error) {
      console.error('❌ Failed to send emails to admins:', error);
      return false;
    }
  }

  // إرسال إشعار تذكرة جديدة
  async sendNewTicketNotification(ticket) {
    const subject = `🎫 تذكرة جديدة: ${ticket.id}`;
    const text = `
تم استلام تذكرة جديدة من البوابة العامة

رقم التذكرة: ${ticket.id}
المرسل: ${ticket.requesterName}
البريد: ${ticket.requesterEmail || 'غير محدد'}
الفرع: ${ticket.branch}
الأولوية: ${ticket.priority}
الوصف: ${ticket.description}

يرجى الدخول إلى النظام للرد على التذكرة.
    `.trim();

    return await this.sendToAdmins({ subject, text });
  }

  // قالب HTML أساسي
  generateHtmlTemplate(text, subject) {
    return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 30px 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { padding: 30px 20px; color: #333; line-height: 1.8; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px; }
        .button { display: inline-block; padding: 12px 30px; background: #1e40af; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📧 ${subject || 'إشعار من نظام ITAM'}</h1>
        </div>
        <div class="content">
            <p style="white-space: pre-line;">${text}</p>
        </div>
        <div class="footer">
            <p>نظام إدارة تقنية المعلومات الموحد</p>
            <p>هذا بريد إلكتروني تلقائي، الرجاء عدم الرد عليه</p>
        </div>
    </div>
</body>
</html>
    `.trim();
  }

  // التحقق من حالة الخدمة
  isConfigured() {
    return this.transporter !== null && this.settings !== null;
  }
}

// تصدير instance واحد (Singleton)
const emailService = new EmailService();
export default emailService;
