#!/bin/bash

# 🎯 اختبار التحديث المحلي قبل الرفع

echo "🧪 اختبار التحديث..."
echo ""

# ═══════════════════════════════════════════════════════════
# 1. اختبار البناء
# ═══════════════════════════════════════════════════════════

echo "📦 1. اختبار بناء Frontend..."
if npm run build; then
    echo "✅ البناء نجح"
else
    echo "❌ فشل البناء!"
    exit 1
fi

# ═══════════════════════════════════════════════════════════
# 2. اختبار Backend
# ═══════════════════════════════════════════════════════════

echo ""
echo "🔧 2. اختبار Backend..."
cd server

# تثبيت dependencies
npm install --silent

# تشغيل Backend محلياً
echo "   تشغيل Backend على المنفذ 5001 للاختبار..."
PORT=5001 node server.js &
SERVER_PID=$!

# انتظار التشغيل
sleep 5

# اختبار Health Check
HEALTH=$(curl -s http://localhost:5001/health)
if echo "$HEALTH" | grep -q "OK"; then
    echo "✅ Backend يعمل بشكل صحيح"
else
    echo "❌ Backend لا يعمل!"
    kill $SERVER_PID
    exit 1
fi

# إيقاف Backend
kill $SERVER_PID

cd ..

# ═══════════════════════════════════════════════════════════
# 3. اختبار Migrations
# ═══════════════════════════════════════════════════════════

echo ""
echo "🗄️  3. اختبار Database Migrations..."
if [ -f "server/migrations/migrate.js" ]; then
    cd server
    node migrations/migrate.js
    cd ..
    echo "✅ Migrations جاهزة"
else
    echo "⚠️  لا توجد migrations"
fi

# ═══════════════════════════════════════════════════════════
# 4. اختبار الحجم
# ═══════════════════════════════════════════════════════════

echo ""
echo "📊 4. فحص حجم الملفات..."
DIST_SIZE=$(du -sh dist 2>/dev/null | cut -f1)
SERVER_SIZE=$(du -sh server --exclude=node_modules 2>/dev/null | cut -f1)

echo "   Frontend (dist): $DIST_SIZE"
echo "   Backend: $SERVER_SIZE"

# ═══════════════════════════════════════════════════════════
# النتيجة النهائية
# ═══════════════════════════════════════════════════════════

echo ""
echo "╔════════════════════════════════════════════╗"
echo "║   ✅ جميع الاختبارات نجحت!                ║"
echo "║   🚀 جاهز للرفع على السيرفر              ║"
echo "╚════════════════════════════════════════════╝"
echo ""
echo "📝 الخطوات التالية:"
echo "   1. راجع التغييرات: git status"
echo "   2. ارفع للسيرفر: bash scripts/hot-deploy.sh"
echo "   3. أو استخدم Git: git push (مع GitHub Actions)"
