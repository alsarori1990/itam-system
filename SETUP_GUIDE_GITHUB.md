# 🚀 دليل الرفع الكامل باستخدام GitHub Actions

## 📋 الخطوات من البداية للنهاية

---

## **المرحلة 1️⃣: إعداد GitHub Repository**

### الخطوة 1: إنشاء Repository على GitHub

```bash
# على جهازك المحلي
cd "d:\Unified IT Management System"

# 1. تهيئة Git
git init

# 2. إضافة جميع الملفات
git add .

# 3. أول Commit
git commit -m "Initial commit - Unified IT Management System"
```

### الخطوة 2: ربط مع GitHub

```bash
# 1. اذهب إلى GitHub.com
# 2. اضغط "New Repository"
# 3. اسم Repository: itam-system (أو أي اسم تريد)
# 4. اجعله Private (موصى به)
# 5. لا تضف README أو .gitignore

# 6. نفذ هذه الأوامر:
git remote add origin https://github.com/YOUR_USERNAME/itam-system.git
git branch -M main
git push -u origin main
```

✅ **الآن الكود على GitHub!**

---

## **المرحلة 2️⃣: إعداد السيرفر (Hostinger KVM 2)**

### الخطوة 3: الاتصال بالسيرفر

```bash
# احصل على معلومات السيرفر من Hostinger:
# - IP Address
# - Root Password

# اتصل بالسيرفر
ssh root@YOUR_SERVER_IP
```

### الخطوة 4: تثبيت البرامج الأساسية

```bash
# تحديث النظام
apt update && apt upgrade -y

# تثبيت الأدوات الأساسية
apt install -y git curl wget nginx

# تثبيت Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# التحقق
node --version  # يجب أن يكون v18.x
npm --version
```

### الخطوة 5: تثبيت MongoDB

```bash
# إضافة MongoDB Repository
curl -fsSL https://www.mongodb.org/static/pgp/server-6.0.asc | gpg --dearmor -o /usr/share/keyrings/mongodb-archive-keyring.gpg

echo "deb [signed-by=/usr/share/keyrings/mongodb-archive-keyring.gpg] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-6.0.list

# تثبيت
apt update
apt install -y mongodb-org

# تشغيل
systemctl start mongod
systemctl enable mongod

# التحقق
systemctl status mongod
```

### الخطوة 6: تثبيت PM2

```bash
npm install -g pm2
pm2 startup  # ينشئ service للتشغيل التلقائي
# انسخ ونفذ الأمر الذي يظهر
```

---

## **المرحلة 3️⃣: إعداد المشروع على السيرفر**

### الخطوة 7: إنشاء SSH Key للسيرفر

```bash
# على السيرفر
ssh-keygen -t rsa -b 4096 -C "server@itam-system"
# اضغط Enter 3 مرات (بدون passphrase)

# عرض المفتاح العام
cat ~/.ssh/id_rsa.pub
```

**انسخ المفتاح العام كاملاً**

### الخطوة 8: إضافة SSH Key لـ GitHub

1. اذهب إلى GitHub → Settings → SSH and GPG keys
2. اضغط "New SSH key"
3. Title: `Hostinger Server`
4. Key: الصق المفتاح العام
5. اضغط "Add SSH key"

### الخطوة 9: استنساخ المشروع

```bash
# على السيرفر
cd /var/www
git clone git@github.com:YOUR_USERNAME/itam-system.git itam-system
cd itam-system

# تثبيت Dependencies
npm install
cd server
npm install
cd ..
```

### الخطوة 10: إعداد ملف البيئة

```bash
# على السيرفر
nano server/.env
```

أضف هذا المحتوى:

```env
# Server Configuration
NODE_ENV=production
PORT=5000

# Database
MONGODB_URI=mongodb://localhost:27017/itam_system

# JWT
JWT_SECRET=YOUR_SUPER_SECRET_KEY_CHANGE_THIS_123456789
JWT_EXPIRE=7d

# CORS
CORS_ORIGIN=https://yourdomain.com

# Rate Limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_PATH=/var/www/itam-system/uploads
```

**احفظ بـ Ctrl+X ثم Y ثم Enter**

⚠️ **مهم:** غيّر `JWT_SECRET` لقيمة عشوائية قوية!

```bash
# لتوليد JWT_SECRET عشوائي:
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## **المرحلة 4️⃣: بناء ورفع التطبيق**

### الخطوة 11: بناء Frontend

```bash
# على السيرفر
cd /var/www/itam-system
npm run build
```

### الخطوة 12: تشغيل Backend بـ PM2

```bash
cd /var/www/itam-system/server

# تشغيل
pm2 start server.js --name itam-backend

# حفظ التكوين
pm2 save

# التحقق
pm2 status
pm2 logs itam-backend
```

---

## **المرحلة 5️⃣: إعداد Nginx**

### الخطوة 13: تكوين Nginx

```bash
# على السيرفر
nano /etc/nginx/sites-available/itam-system
```

أضف:

```nginx
# Rate limiting
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=login_limit:10m rate=5r/m;

upstream backend {
    server localhost:5000;
    keepalive 64;
}

server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    root /var/www/itam-system/dist;
    index index.html;
    
    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript;
    
    # Frontend (React)
    location / {
        try_files $uri $uri/ /index.html;
        expires 1h;
        add_header Cache-Control "public, must-revalidate";
    }
    
    # API Backend
    location /api/ {
        limit_req zone=api_limit burst=20 nodelay;
        
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Login endpoint (rate limited)
    location /api/auth/login {
        limit_req zone=login_limit burst=3 nodelay;
        
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
    
    # Static assets (cache heavily)
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

**غيّر `yourdomain.com` لدومينك الفعلي**

```bash
# تفعيل الموقع
ln -s /etc/nginx/sites-available/itam-system /etc/nginx/sites-enabled/

# حذف الموقع الافتراضي
rm /etc/nginx/sites-enabled/default

# اختبار التكوين
nginx -t

# إعادة تحميل Nginx
systemctl reload nginx
```

### الخطوة 14: تثبيت SSL (Let's Encrypt)

```bash
# تثبيت Certbot
apt install -y certbot python3-certbot-nginx

# الحصول على شهادة SSL
certbot --nginx -d yourdomain.com -d www.yourdomain.com

# إدخل البريد الإلكتروني
# اقبل الشروط
# اختر: Redirect (للتحويل التلقائي لـ HTTPS)

# تجديد تلقائي (اختبار)
certbot renew --dry-run
```

✅ **الآن الموقع يعمل على HTTPS!**

---

## **المرحلة 6️⃣: إعداد GitHub Actions للتحديث التلقائي**

### الخطوة 15: إنشاء SSH Key للـ GitHub Actions

```bash
# على السيرفر
ssh-keygen -t rsa -b 4096 -f ~/.ssh/github_actions -C "github-actions"
# اضغط Enter مرتين (بدون passphrase)

# عرض المفتاح الخاص
cat ~/.ssh/github_actions
```

**انسخ المفتاح الخاص كاملاً** (من BEGIN حتى END)

```bash
# عرض المفتاح العام
cat ~/.ssh/github_actions.pub
```

**انسخ المفتاح العام أيضاً**

### الخطوة 16: إضافة المفتاح العام للسيرفر

```bash
# على السيرفر
cat ~/.ssh/github_actions.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

### الخطوة 17: إضافة Secrets في GitHub

1. اذهب إلى GitHub Repository
2. Settings → Secrets and variables → Actions
3. اضغط "New repository secret"

أضف هذه الـ Secrets:

| Name | Value |
|------|-------|
| `SSH_PRIVATE_KEY` | المفتاح الخاص (من الخطوة 15) |
| `SERVER_IP` | عنوان IP السيرفر |
| `SERVER_USER` | `root` |

### الخطوة 18: تعديل ملف GitHub Actions

```bash
# على جهازك المحلي
code .github/workflows/deploy.yml
```

تأكد من تحديث:
- `branches:` إذا كان فرعك غير `main`
- استبدل `yourdomain.com` بدومينك الفعلي

### الخطوة 19: رفع التغييرات

```bash
# على جهازك المحلي
git add .
git commit -m "Configure GitHub Actions deployment"
git push
```

---

## **المرحلة 7️⃣: أول Deployment تلقائي!**

### الخطوة 20: مراقبة التحديث

1. اذهب إلى GitHub Repository
2. تبويب "Actions"
3. شاهد الـ Workflow يعمل!

إذا نجح كل شيء:
- ✅ الكود يُبنى
- ✅ يُرفع للسيرفر
- ✅ يُحدّث تلقائياً
- ✅ Health Check ينجح

---

## **المرحلة 8️⃣: إنشاء أول مستخدم**

### الخطوة 21: إنشاء مستخدم Admin

```bash
# على السيرفر
cd /var/www/itam-system/server
node -e "
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/itam_system').then(async () => {
  const User = mongoose.model('User', new mongoose.Schema({
    username: String,
    email: String,
    password: String,
    role: String,
    isActive: Boolean
  }));
  
  const hashedPassword = await bcrypt.hash('Admin@123', 10);
  
  await User.create({
    username: 'admin',
    email: 'admin@company.com',
    password: hashedPassword,
    role: 'admin',
    isActive: true
  });
  
  console.log('✅ Admin user created!');
  console.log('Username: admin');
  console.log('Password: Admin@123');
  console.log('⚠️  Please change password after first login!');
  
  process.exit(0);
});
"
```

---

## **✅ اكتمل الرفع!**

### 🎯 النتيجة النهائية:

- ✅ النظام مرفوع على السيرفر
- ✅ قاعدة البيانات جاهزة
- ✅ SSL مُثبّت (HTTPS)
- ✅ GitHub Actions مُفعّل
- ✅ كل push → تحديث تلقائي!

### 🌐 الوصول للنظام:

```
https://yourdomain.com
Username: admin
Password: Admin@123
```

---

## **📝 التطوير اليومي**

الآن كل ما عليك:

```bash
# 1. طوّر محلياً
code .

# 2. اختبر
npm run dev

# 3. ارفع
git add .
git commit -m "إضافة ميزة جديدة"
git push

# 4. GitHub Actions يتولى الباقي تلقائياً! 🚀
```

---

## **🔧 الصيانة**

### مراقبة النظام:
```bash
# حالة PM2
pm2 status
pm2 logs itam-backend

# حالة MongoDB
systemctl status mongod

# حالة Nginx
systemctl status nginx

# مساحة القرص
df -h

# استخدام الذاكرة
free -h
```

### نسخ احتياطي:
```bash
# يدوي
bash /var/www/itam-system/scripts/backup.sh

# تلقائي (كل يوم الساعة 2 صباحاً)
crontab -e
# أضف:
0 2 * * * /var/www/itam-system/scripts/backup.sh
```

---

## **🆘 حل المشاكل**

### السيرفر لا يستجيب؟
```bash
# تحقق من PM2
pm2 restart itam-backend

# تحقق من Nginx
systemctl restart nginx

# تحقق من MongoDB
systemctl restart mongod
```

### GitHub Actions فشل؟
1. تحقق من Secrets (SSH_PRIVATE_KEY, SERVER_IP)
2. تحقق من SSH access: `ssh root@SERVER_IP`
3. راجع الـ logs في تبويب Actions

### لا يمكن الوصول للموقع؟
```bash
# تحقق من Firewall
ufw status
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 22/tcp
ufw enable

# تحقق من Nginx
nginx -t
systemctl restart nginx
```

---

**🎉 مبروك! نظامك الآن مرفوع واحترافي!**

أي تطوير جديد = فقط `git push` وكل شيء يتحدث تلقائياً! ✨
