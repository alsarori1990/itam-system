#!/bin/bash
set -e  # توقف عند أي خطأ

echo "🚀 بدء نشر نظام إدارة تكنولوجيا المعلومات الموحد"
echo "=================================================="

# التأكد من المجلد الصحيح
cd /var/www

# حذف أي محاولة سابقة
if [ -d "itam-system" ]; then
    echo "🗑️  حذف المجلد السابق..."
    rm -rf itam-system
fi

# استنساخ المشروع
echo "📥 استنساخ المشروع من GitHub..."
git clone https://github.com/alsarori1990/itam-system.git itam-system
cd itam-system

# إنشاء ملف .env
echo "⚙️  إنشاء ملف الإعدادات..."
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

# التحقق من إنشاء الملف
if [ -f "server/.env" ]; then
    echo "✅ تم إنشاء ملف .env بنجاح"
else
    echo "❌ فشل في إنشاء ملف .env"
    exit 1
fi

# تثبيت dependencies للمشروع الرئيسي
echo "📦 تثبيت dependencies للمشروع الرئيسي..."
npm install

# تثبيت dependencies للـ backend
echo "📦 تثبيت dependencies للـ backend..."
cd server
npm install
cd ..

# بناء Frontend
echo "🏗️  بناء Frontend..."
npm run build

# إنشاء مجلد uploads
echo "📁 إنشاء مجلد uploads..."
mkdir -p server/uploads
chmod 755 server/uploads

# إيقاف أي عملية سابقة
echo "⏹️  إيقاف أي عمليات سابقة..."
pm2 stop itam-backend 2>/dev/null || true
pm2 delete itam-backend 2>/dev/null || true

# تشغيل Backend بـ PM2
echo "🚀 تشغيل Backend..."
cd server
pm2 start server.js --name itam-backend --env production

# حفظ إعدادات PM2
echo "💾 حفظ إعدادات PM2..."
pm2 save

# العودة للمجلد الرئيسي
cd /var/www/itam-system

echo ""
echo "🎉 تم الانتهاء من النشر بنجاح!"
echo "=================================================="

# عرض حالة PM2
echo "📊 حالة PM2:"
pm2 status

echo ""
echo "🔍 اختبار API:"
sleep 5  # انتظار تشغيل السيرفر
curl -s http://localhost:5000/health || echo "⚠️  لم يستجب API بعد"

echo ""
echo "📋 معلومات مهمة:"
echo "- Backend URL: http://72.62.149.231:5000"
echo "- PM2 Logs: pm2 logs itam-backend"
echo "- PM2 Restart: pm2 restart itam-backend"
echo "- PM2 Stop: pm2 stop itam-backend"
echo ""
echo "الخطوة التالية: إعداد Nginx للوصول من المتصفح"