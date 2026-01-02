# 🚀 دليل رفع النظام على Hostinger KVM 2

## 📋 المتطلبات الأساسية

### على السيرفر:
- ✅ Ubuntu 20.04+ أو CentOS 7+
- ✅ Node.js 18+
- ✅ MongoDB 6.0+ أو PostgreSQL 14+
- ✅ Nginx (للـ Reverse Proxy)
- ✅ PM2 (لإدارة العمليات)
- ✅ SSL Certificate (Let's Encrypt)

---

## 🔧 خطوات التثبيت على Hostinger KVM 2

### الخطوة 1: الاتصال بالسيرفر

```bash
ssh root@your-server-ip
```

### الخطوة 2: تحديث النظام وتثبيت المتطلبات

```bash
# تحديث النظام
sudo apt update && sudo apt upgrade -y

# تثبيت الأدوات الأساسية
sudo apt install -y curl wget git build-essential

# تثبيت Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# التحقق من النسخة
node -v  # يجب أن تكون 18+
npm -v
```

### الخطوة 3: تثبيت MongoDB

```bash
# إضافة مستودع MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list

# تثبيت MongoDB
sudo apt update
sudo apt install -y mongodb-org

# تشغيل MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# التحقق من التشغيل
sudo systemctl status mongod
```

### الخطوة 4: تثبيت PM2

```bash
sudo npm install -g pm2

# إضافة PM2 للتشغيل التلقائي
pm2 startup
# اتبع التعليمات التي تظهر
```

### الخطوة 5: تثبيت Nginx

```bash
sudo apt install -y nginx

# تشغيل Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### الخطوة 6: رفع ملفات النظام

```bash
# إنشاء مجلد للتطبيق
sudo mkdir -p /var/www/itam-system
cd /var/www/itam-system

# نقل الملفات (من جهازك المحلي)
# استخدم SCP أو SFTP:
# scp -r "D:\Unified IT Management System\*" root@your-server-ip:/var/www/itam-system/

# أو استخدم Git:
git clone https://your-repo-url.git .
```

### الخطوة 7: إعداد Backend

```bash
cd /var/www/itam-system/server

# تثبيت dependencies
npm install

# إنشاء ملف .env
cp .env.example .env
nano .env

# عدّل الإعدادات:
# MONGODB_URI=mongodb://localhost:27017/itam_system
# JWT_SECRET=your-super-secret-key-here
# CORS_ORIGIN=https://yourdomain.com
# NODE_ENV=production
```

### الخطوة 8: بناء Frontend

```bash
cd /var/www/itam-system

# تثبيت dependencies
npm install

# بناء المشروع للإنتاج
npm run build

# سيتم إنشاء مجلد dist
```

### الخطوة 9: تشغيل Backend بـ PM2

```bash
cd /var/www/itam-system/server

# تشغيل التطبيق
pm2 start server.js --name "itam-backend"

# حفظ التكوين
pm2 save

# مراقبة التطبيق
pm2 status
pm2 logs itam-backend
```

### الخطوة 10: إعداد Nginx كـ Reverse Proxy

```bash
sudo nano /etc/nginx/sites-available/itam-system
```

أضف التكوين التالي:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Frontend (Static Files)
    root /var/www/itam-system/dist;
    index index.html;

    # Gzip Compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    gzip_min_length 1000;

    # Frontend Routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Health Check
    location /health {
        proxy_pass http://localhost:5000;
        access_log off;
    }

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Cache Static Assets
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

تفعيل التكوين:

```bash
sudo ln -s /etc/nginx/sites-available/itam-system /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### الخطوة 11: تثبيت SSL Certificate (مجاني)

```bash
# تثبيت Certbot
sudo apt install -y certbot python3-certbot-nginx

# الحصول على الشهادة
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# التجديد التلقائي
sudo certbot renew --dry-run
```

Nginx سيتم تحديثه تلقائياً:

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    # باقي التكوين...
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

### الخطوة 12: إعداد Firewall

```bash
# السماح بالمنافذ الضرورية
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable

# التحقق
sudo ufw status
```

### الخطوة 13: إنشاء قاعدة البيانات الأولية

```bash
# الدخول إلى MongoDB
mongosh

# إنشاء قاعدة البيانات
use itam_system

# إنشاء مستخدم admin
db.users.insertOne({
  id: "USR-ADMIN",
  name: "مدير النظام",
  email: "admin@yourdomain.com",
  password: "$2a$12$...", // سيتم تشفيرها تلقائياً عبر API
  roles: ["Super Admin"],
  branches: [],
  isActive: true,
  createdAt: new Date()
});

exit
```

### الخطوة 14: النسخ الاحتياطي التلقائي

```bash
# إنشاء سكريبت للنسخ الاحتياطي
sudo nano /usr/local/bin/backup-itam.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/itam-system"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# نسخ قاعدة البيانات
mongodump --db=itam_system --out=$BACKUP_DIR/mongo_$DATE

# نسخ الملفات
tar -czf $BACKUP_DIR/files_$DATE.tar.gz /var/www/itam-system/server/uploads

# حذف النسخ الأقدم من 7 أيام
find $BACKUP_DIR -type f -mtime +7 -delete

echo "Backup completed: $DATE"
```

```bash
# جعل السكريبت قابل للتنفيذ
sudo chmod +x /usr/local/bin/backup-itam.sh

# إضافة Cron Job (يومياً الساعة 2 صباحاً)
sudo crontab -e

# أضف السطر التالي:
0 2 * * * /usr/local/bin/backup-itam.sh >> /var/log/itam-backup.log 2>&1
```

---

## 🔍 التحقق من التثبيت

```bash
# 1. التحقق من Backend
pm2 status
pm2 logs itam-backend

# 2. التحقق من MongoDB
sudo systemctl status mongod

# 3. التحقق من Nginx
sudo nginx -t
sudo systemctl status nginx

# 4. اختبار API
curl http://localhost:5000/health

# 5. اختبار عبر الإنترنت
curl https://yourdomain.com/health
```

---

## 📊 المراقبة والصيانة

### مراقبة PM2

```bash
# عرض الحالة
pm2 status

# عرض السجلات
pm2 logs itam-backend

# إعادة التشغيل
pm2 restart itam-backend

# إيقاف
pm2 stop itam-backend
```

### مراقبة MongoDB

```bash
# الدخول
mongosh

# إحصائيات
use itam_system
db.stats()

# عدد السجلات
db.assets.countDocuments()
db.tickets.countDocuments()
```

### مراقبة Nginx

```bash
# السجلات
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# إعادة التحميل
sudo systemctl reload nginx
```

---

## 🚨 استكشاف الأخطاء

### المشكلة: Backend لا يعمل

```bash
# التحقق من السجلات
pm2 logs itam-backend --lines 100

# التحقق من المنفذ
sudo netstat -tulpn | grep 5000

# إعادة التشغيل
pm2 restart itam-backend
```

### المشكلة: MongoDB لا يستجيب

```bash
# التحقق من الحالة
sudo systemctl status mongod

# إعادة التشغيل
sudo systemctl restart mongod

# السجلات
sudo tail -f /var/log/mongodb/mongod.log
```

### المشكلة: 502 Bad Gateway

```bash
# التحقق من Backend
pm2 status

# التحقق من Nginx
sudo nginx -t
sudo systemctl restart nginx
```

---

## 📈 تحسينات الأداء

### 1. تفعيل Redis للـ Caching

```bash
sudo apt install -y redis-server
sudo systemctl enable redis-server
```

### 2. زيادة حدود Node.js

```bash
# في ملف PM2
pm2 start server.js --name itam-backend --max-memory-restart 1G --node-args="--max-old-space-size=2048"
```

### 3. تحسين MongoDB

```bash
# في /etc/mongod.conf
storage:
  wiredTiger:
    engineConfig:
      cacheSizeGB: 2
```

---

## 🔐 الأمان

### 1. تعطيل Root Login

```bash
sudo nano /etc/ssh/sshd_config
# PermitRootLogin no
sudo systemctl reload sshd
```

### 2. Fail2Ban

```bash
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
```

### 3. تحديثات تلقائية

```bash
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

---

## ✅ Checklist النهائية

- [ ] Node.js مثبت (18+)
- [ ] MongoDB يعمل
- [ ] Backend يعمل عبر PM2
- [ ] Frontend تم بناؤه
- [ ] Nginx مُكوّن بشكل صحيح
- [ ] SSL Certificate مُفعّل
- [ ] Firewall مُكوّن
- [ ] النسخ الاحتياطي التلقائي يعمل
- [ ] المراقبة مُفعّلة
- [ ] اختبار كامل للنظام

---

**🎉 تم! النظام الآن جاهز للاستخدام على:** `https://yourdomain.com`
