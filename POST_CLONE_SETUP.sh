#!/bin/bash
# أوامر ما بعد استنساخ المشروع بنجاح

echo "=== ابدأ التنفيذ بعد نجاح git clone ==="

# 1. ادخل للمشروع
cd itam-system

# 2. إنشاء ملف .env
echo "=== إنشاء ملف .env ==="
cat > server/.env << 'EOF'
NODE_ENV=production
PORT=5000
HOST=0.0.0.0
MONGODB_URI=mongodb://localhost:27017/itam_system
JWT_SECRET=a8f9c2d4e6b1f3a7c9e2d5b8f1a4c7e9d2b5f8a1c4e7d0b3f6a9c2e5d8b1f4a7
JWT_EXPIRE=7d
CORS_ORIGIN=http://72.62.149.231
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100
MAX_FILE_SIZE=10485760
UPLOAD_PATH=/var/www/itam-system/server/uploads
GEMINI_API_KEY=
EOF

echo "✅ تم إنشاء ملف .env"

# 3. تثبيت Dependencies
echo "=== تثبيت Dependencies للمشروع الرئيسي ==="
npm install

echo "=== تثبيت Dependencies للـ Backend ==="
cd server
npm install
cd ..

# 4. بناء Frontend
echo "=== بناء Frontend ==="
npm run build

# 5. إنشاء مجلد uploads
echo "=== إنشاء مجلد uploads ==="
mkdir -p server/uploads
chmod 755 server/uploads

# 6. تشغيل Backend بـ PM2
echo "=== تشغيل Backend بـ PM2 ==="
cd server
pm2 start server.js --name itam-backend --env production
cd ..

# 7. حفظ إعدادات PM2
echo "=== حفظ إعدادات PM2 ==="
pm2 save

# 8. التحقق من حالة التشغيل
echo "=== التحقق من حالة PM2 ==="
pm2 status

echo "=== اختبار Backend API ==="
curl http://localhost:5000/health

echo ""
echo "🎉 تم الانتهاء من التنصيب!"
echo "📝 للتحقق من الـ logs: pm2 logs itam-backend"
echo "🔄 لإعادة تشغيل: pm2 restart itam-backend"
echo "⏹️  لإيقاف: pm2 stop itam-backend"
echo ""
echo "الخطوة التالية: إعداد Nginx"