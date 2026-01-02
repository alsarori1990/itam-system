#!/bin/bash

# 🚀 سكريبت الرفع السريع على Hostinger

echo "=========================================="
echo "   نظام إدارة الأصول - Deployment Script"
echo "=========================================="

# المتغيرات
SERVER_IP="your-server-ip"
SERVER_USER="root"
APP_DIR="/var/www/itam-system"
DOMAIN="yourdomain.com"

echo "📦 1. بناء Frontend..."
npm run build

echo ""
echo "📤 2. رفع الملفات إلى السيرفر..."
scp -r dist/ ${SERVER_USER}@${SERVER_IP}:${APP_DIR}/
scp -r server/ ${SERVER_USER}@${SERVER_IP}:${APP_DIR}/

echo ""
echo "🔧 3. تثبيت وإعداد Backend على السيرفر..."
ssh ${SERVER_USER}@${SERVER_IP} << 'EOF'
  cd /var/www/itam-system/server
  npm install --production
  
  # إنشاء .env إذا لم يكن موجوداً
  if [ ! -f .env ]; then
    cp .env.example .env
    echo "⚠️  تحذير: يرجى تعديل ملف .env"
  fi
  
  # إعادة تشغيل PM2
  pm2 restart itam-backend || pm2 start server.js --name itam-backend
  pm2 save
  
  # إعادة تحميل Nginx
  sudo systemctl reload nginx
EOF

echo ""
echo "✅ تم الرفع بنجاح!"
echo ""
echo "🌐 الموقع: https://${DOMAIN}"
echo "🔍 للتحقق: https://${DOMAIN}/health"
echo ""
echo "📊 مراقبة السيرفر:"
echo "   ssh ${SERVER_USER}@${SERVER_IP}"
echo "   pm2 logs itam-backend"
