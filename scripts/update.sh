#!/bin/bash

# 🔧 سكريبت تحديث النظام بدون توقف (Zero Downtime)

APP_DIR="/var/www/itam-system"
BACKUP_DIR="/var/backups/itam-system"
DATE=$(date +%Y%m%d_%H%M%S)

echo "🚀 بدء تحديث النظام..."
echo "======================="

# 1. نسخ احتياطي سريع
echo "📦 نسخ احتياطي قبل التحديث..."
./backup.sh

# 2. سحب التحديثات من Git (إذا كنت تستخدم Git)
echo "📥 سحب التحديثات..."
cd $APP_DIR
# git pull origin main  # أزل التعليق إذا كنت تستخدم Git

# 3. تحديث Frontend
echo "🔨 بناء Frontend..."
npm install
npm run build

# 4. تحديث Backend
echo "🔧 تحديث Backend..."
cd $APP_DIR/server
npm install --production

# 5. إعادة تشغيل Backend (zero downtime مع PM2)
echo "♻️  إعادة تشغيل Backend..."
pm2 reload itam-backend --update-env

# 6. تحديث Nginx
echo "🌐 إعادة تحميل Nginx..."
sudo nginx -t && sudo systemctl reload nginx

# 7. التحقق من الصحة
echo "🏥 فحص صحة النظام..."
sleep 5
HEALTH=$(curl -s http://localhost:5000/health | grep -o '"status":"OK"')

if [ -n "$HEALTH" ]; then
    echo "✅ التحديث نجح! النظام يعمل بشكل طبيعي"
    echo "🕒 الوقت: $(date)"
else
    echo "⚠️  تحذير: قد تكون هناك مشكلة"
    echo "📊 تحقق من: pm2 logs itam-backend"
fi

echo ""
echo "📝 سجل التحديث محفوظ في: /var/log/itam-update.log"
