#!/bin/bash

# 🔥 وضع التطوير المباشر - يعكس التغييرات فوراً

# ═══════════════════════════════════════════════════════════
# هذا السكريبت يستخدم أثناء التطوير فقط
# يراقب التغييرات ويرفعها تلقائياً للسيرفر
# ═══════════════════════════════════════════════════════════

SERVER_IP="your-server-ip"
SERVER_USER="root"
APP_DIR="/var/www/itam-system"

echo "🔥 وضع التطوير المباشر (Live Development Mode)"
echo "================================================="
echo ""
echo "📝 الملفات التي سيتم مراقبتها:"
echo "   - Frontend: src/, components/, public/"
echo "   - Backend: server/"
echo ""
echo "⚠️  كل تغيير سيُرفع تلقائياً للسيرفر"
echo ""

# تثبيت fswatch إذا لم يكن موجوداً
if ! command -v fswatch &> /dev/null; then
    echo "❌ fswatch غير مثبت"
    echo "تثبيت: brew install fswatch (Mac) أو apt install fswatch (Linux)"
    exit 1
fi

# دالة الرفع والتحديث
sync_and_reload() {
    local changed_file=$1
    
    echo ""
    echo "🔄 تغيير اكتُشف: $changed_file"
    echo "⏰ $(date '+%H:%M:%S')"
    
    # تحديد نوع الملف
    if [[ $changed_file == *"server/"* ]]; then
        echo "📤 رفع Backend..."
        
        # رفع ملفات Backend
        rsync -avz --delete \
            --exclude 'node_modules' \
            --exclude '.env' \
            server/ ${SERVER_USER}@${SERVER_IP}:${APP_DIR}/server/
        
        # إعادة تشغيل Backend
        ssh ${SERVER_USER}@${SERVER_IP} "pm2 reload itam-backend"
        
        echo "✅ Backend محدّث"
        
    else
        echo "📤 رفع Frontend..."
        
        # بناء Frontend
        npm run build --silent
        
        # رفع dist
        rsync -avz --delete \
            dist/ ${SERVER_USER}@${SERVER_IP}:${APP_DIR}/dist/
        
        echo "✅ Frontend محدّث"
    fi
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# مراقبة التغييرات
echo "👀 بدء المراقبة..."
echo ""

fswatch -o \
    -e "node_modules" \
    -e "dist" \
    -e ".git" \
    -e "*.log" \
    src/ components/ public/ server/ | while read change
do
    # تأخير صغير لتجميع التغييرات المتعددة
    sleep 1
    sync_and_reload "$change"
done
