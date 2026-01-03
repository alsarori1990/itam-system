# دليل حل مشاكل SMTP

## ✅ تم الإصلاح
- **المشكلة**: البيانات لا تُحفظ بعد تحديث الصفحة
- **السبب**: كان السيرفر لا يحمل الإعدادات المحفوظة عند إعادة التشغيل
- **الحل**: تم تعديل `server.js` لتحميل إعدادات SMTP من قاعدة البيانات تلقائياً عند الاتصال بـ MongoDB

## 🔴 خطأ 535 Authentication Rejected

### الأسباب المحتملة:

#### 1. **GoDaddy/Secureserver - إعدادات خاطئة**
```
❌ خطأ: smtpout.secureserver.net مع Port 587
✅ صحيح: 
   - Host: smtpout.secureserver.net
   - Port: 465 (SSL)
   - أو استخدم: smtp.secureserver.net مع Port 587 (TLS)
```

#### 2. **كلمة المرور تحتوي رموز خاصة**
- إذا كانت كلمة المرور تحتوي على: `@`, `#`, `$`, `%`, `&`
- قد تحتاج URL encoding أو تغيير كلمة المرور

#### 3. **البريد الإلكتروني يحتاج تفعيل SMTP**
- تأكد من تفعيل SMTP في لوحة تحكم GoDaddy
- بعض الحسابات تتطلب App Password بدلاً من كلمة المرور العادية

### خطوات الحل:

#### ✅ الحل 1: تغيير Port إلى 465
```json
{
  "enabled": true,
  "host": "smtpout.secureserver.net",
  "port": "465",  // SSL
  "user": "it@daralesnad.net",
  "pass": "كلمة_المرور",
  "fromEmail": "it@daralesnad.net",
  "adminEmails": "yaa@daralesnad.net"
}
```

#### ✅ الحل 2: استخدام smtp.secureserver.net مع TLS
```json
{
  "enabled": true,
  "host": "smtp.secureserver.net",
  "port": "587",  // TLS
  "user": "it@daralesnad.net",
  "pass": "كلمة_المرور",
  "fromEmail": "it@daralesnad.net",
  "adminEmails": "yaa@daralesnad.net"
}
```

#### ✅ الحل 3: التحقق من كلمة المرور
1. سجل خروج من حساب GoDaddy Email
2. حاول تسجيل الدخول بنفس كلمة المرور
3. إذا فشل، غيّر كلمة المرور من لوحة التحكم
4. استخدم كلمة مرور بدون رموز خاصة معقدة

### إعدادات SMTP حسب مزود الخدمة:

#### 📧 Gmail
```
Host: smtp.gmail.com
Port: 587 (TLS) أو 465 (SSL)
User: yourname@gmail.com
Pass: App Password (16 حرف من Google Account Security)
```

#### 📧 Outlook/Hotmail
```
Host: smtp-mail.outlook.com
Port: 587 (TLS)
User: yourname@outlook.com
Pass: كلمة المرور العادية
```

#### 📧 GoDaddy Email
```
Host: smtpout.secureserver.net
Port: 465 (SSL) أو 587 (TLS)
User: البريد الإلكتروني الكامل
Pass: كلمة مرور البريد
```

#### 📧 Hostinger
```
Host: smtp.hostinger.com
Port: 587 (TLS) أو 465 (SSL)
User: البريد الإلكتروني الكامل
Pass: كلمة مرور البريد
```

### اختبار الإعدادات:

1. **افتح النظام → الإعدادات → إعدادات البريد**
2. **أدخل الإعدادات المذكورة أعلاه**
3. **اضغط "اختبار الاتصال"** قبل الحفظ
4. **انتظر 5-10 ثواني** للحصول على الرد
5. **إذا نجح الاختبار**:
   - ✅ ستصلك رسالة "تم اختبار الاتصال بنجاح"
   - ✅ اضغط "حفظ" لحفظ الإعدادات
6. **إذا فشل الاختبار**:
   - ❌ ستظهر رسالة الخطأ
   - جرب Port مختلف (465 بدلاً من 587 أو العكس)
   - تحقق من كلمة المرور

### ملاحظات مهمة:

⚠️ **Port 465 vs 587:**
- **465**: يستخدم SSL/TLS من البداية (Implicit TLS)
- **587**: يستخدم STARTTLS (يبدأ غير مشفر ثم يرفع للتشفير)
- معظم السيرفرات الحديثة تفضل **587**

⚠️ **البيانات محفوظة الآن:**
- ✅ بعد الحفظ، ستبقى الإعدادات حتى بعد تحديث الصفحة
- ✅ ستُحمل تلقائياً عند إعادة تشغيل السيرفر
- ✅ مخزنة في MongoDB بشكل دائم

⚠️ **اختبار الإرسال الحقيقي:**
1. افتح البوابة العامة: http://72.62.149.231/public-ticket?mode=public
2. أرسل تذكرة تجريبية
3. تحقق من بريد المسؤولين (yaa@daralesnad.net)

---

## تم ✅
- السيرفر يحمل الإعدادات تلقائياً عند بدء التشغيل
- الإعدادات محفوظة في MongoDB
- يمكنك الآن تحديث الصفحة وستبقى الإعدادات
