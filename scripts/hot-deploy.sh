#!/bin/bash

# 🔄 نظام التحديث المباشر (Hot Deployment) - يحافظ على البيانات

set -e  # إيقاف عند أي خطأ

# ═══════════════════════════════════════════════════════════
# الإعدادات
# ═══════════════════════════════════════════════════════════

APP_NAME="itam-backend"
APP_DIR="/var/www/itam-system"
BACKUP_DIR="/var/backups/itam-system"
DEPLOYMENT_LOG="/var/log/itam-deployment.log"
DATE=$(date +%Y%m%d_%H%M%S)

# الألوان
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ═══════════════════════════════════════════════════════════
# دوال مساعدة
# ═══════════════════════════════════════════════════════════

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a $DEPLOYMENT_LOG
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a $DEPLOYMENT_LOG
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a $DEPLOYMENT_LOG
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a $DEPLOYMENT_LOG
}

# ═══════════════════════════════════════════════════════════
# الخطوة 1: التحقق من البيئة
# ═══════════════════════════════════════════════════════════

check_environment() {
    log "🔍 فحص البيئة..."
    
    # التحقق من PM2
    if ! command -v pm2 &> /dev/null; then
        error "PM2 غير مثبت!"
        exit 1
    fi
    
    # التحقق من MongoDB
    if ! systemctl is-active --quiet mongod; then
        error "MongoDB غير مشغّل!"
        exit 1
    fi
    
    # التحقق من مساحة القرص
    DISK_USAGE=$(df -h $APP_DIR | tail -1 | awk '{print $5}' | sed 's/%//')
    if [ $DISK_USAGE -gt 90 ]; then
        error "مساحة القرص ممتلئة (${DISK_USAGE}%)!"
        exit 1
    fi
    
    log "✅ البيئة جاهزة"
}

# ═══════════════════════════════════════════════════════════
# الخطوة 2: نسخ احتياطي تلقائي قبل التحديث
# ═══════════════════════════════════════════════════════════

create_backup() {
    log "💾 إنشاء نسخة احتياطية..."
    
    mkdir -p $BACKUP_DIR/pre-deployment-$DATE
    
    # نسخ قاعدة البيانات
    info "نسخ قاعدة البيانات..."
    mongodump --db=itam_system --out=$BACKUP_DIR/pre-deployment-$DATE/db --quiet
    
    # نسخ ملفات الكود الحالية
    info "نسخ الملفات..."
    tar -czf $BACKUP_DIR/pre-deployment-$DATE/app.tar.gz \
        -C $APP_DIR \
        --exclude=node_modules \
        --exclude=dist \
        server/ package.json
    
    # نسخ .env
    cp $APP_DIR/server/.env $BACKUP_DIR/pre-deployment-$DATE/env.backup
    
    log "✅ تم النسخ الاحتياطي: $BACKUP_DIR/pre-deployment-$DATE"
}

# ═══════════════════════════════════════════════════════════
# الخطوة 3: سحب التحديثات من Git
# ═══════════════════════════════════════════════════════════

pull_updates() {
    log "📥 سحب التحديثات..."
    
    cd $APP_DIR
    
    # حفظ التغييرات المحلية إن وُجدت
    if [ -d .git ]; then
        git stash push -m "Auto-stash before deployment $DATE"
        
        # سحب التحديثات
        git pull origin main || git pull origin master
        
        # تطبيق التغييرات المحلية
        git stash pop || true
        
        log "✅ تم سحب التحديثات من Git"
    else
        warning "المشروع ليس Git repository - تخطي..."
    fi
}

# ═══════════════════════════════════════════════════════════
# الخطوة 4: تشغيل Database Migrations
# ═══════════════════════════════════════════════════════════

run_migrations() {
    log "🗄️  تشغيل Database Migrations..."
    
    cd $APP_DIR/server
    
    # تحقق من وجود ملف migrations
    if [ -f "migrations/migrate.js" ]; then
        node migrations/migrate.js
        log "✅ تم تشغيل Migrations بنجاح"
    else
        info "لا توجد migrations للتشغيل"
    fi
}

# ═══════════════════════════════════════════════════════════
# الخطوة 5: تحديث Dependencies
# ═══════════════════════════════════════════════════════════

update_dependencies() {
    log "📦 تحديث Dependencies..."
    
    # Backend
    cd $APP_DIR/server
    info "تحديث Backend..."
    npm ci --production --quiet
    
    # Frontend
    cd $APP_DIR
    info "تحديث Frontend..."
    npm ci --quiet
    
    log "✅ تم تحديث Dependencies"
}

# ═══════════════════════════════════════════════════════════
# الخطوة 6: بناء Frontend الجديد
# ═══════════════════════════════════════════════════════════

build_frontend() {
    log "🔨 بناء Frontend..."
    
    cd $APP_DIR
    
    # حذف البناء القديم
    rm -rf dist/
    
    # بناء جديد
    npm run build
    
    log "✅ تم بناء Frontend"
}

# ═══════════════════════════════════════════════════════════
# الخطوة 7: إعادة تشغيل Backend (Zero Downtime)
# ═══════════════════════════════════════════════════════════

reload_backend() {
    log "♻️  إعادة تشغيل Backend (بدون توقف)..."
    
    # PM2 reload يحافظ على التطبيق مشغلاً
    pm2 reload $APP_NAME --update-env
    
    # انتظار جاهزية التطبيق
    sleep 5
    
    log "✅ تم إعادة تشغيل Backend"
}

# ═══════════════════════════════════════════════════════════
# الخطوة 8: تحديث Nginx (بدون انقطاع)
# ═══════════════════════════════════════════════════════════

reload_nginx() {
    log "🌐 تحديث Nginx..."
    
    # اختبار التكوين أولاً
    if sudo nginx -t 2>/dev/null; then
        sudo systemctl reload nginx
        log "✅ تم تحديث Nginx"
    else
        error "تكوين Nginx غير صحيح!"
        return 1
    fi
}

# ═══════════════════════════════════════════════════════════
# الخطوة 9: فحص الصحة (Health Check)
# ═══════════════════════════════════════════════════════════

health_check() {
    log "🏥 فحص صحة النظام..."
    
    local max_attempts=10
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        info "محاولة $attempt من $max_attempts..."
        
        # فحص Backend
        HEALTH_STATUS=$(curl -s http://localhost:5000/health || echo "failed")
        
        if echo "$HEALTH_STATUS" | grep -q "OK"; then
            log "✅ النظام يعمل بشكل طبيعي!"
            
            # عرض معلومات النظام
            echo "$HEALTH_STATUS" | jq '.' 2>/dev/null || echo "$HEALTH_STATUS"
            
            return 0
        fi
        
        sleep 3
        attempt=$((attempt + 1))
    done
    
    error "فشل فحص الصحة بعد $max_attempts محاولات!"
    return 1
}

# ═══════════════════════════════════════════════════════════
# الخطوة 10: إشعار المستخدمين (اختياري)
# ═══════════════════════════════════════════════════════════

notify_users() {
    log "📢 إشعار المستخدمين..."
    
    # يمكنك إضافة:
    # - إشعار WebSocket
    # - إشعار Email
    # - رسالة في Dashboard
    
    # مثال: إضافة ملف إشعار يظهر في Frontend
    cat > $APP_DIR/dist/update-notification.json << EOF
{
  "updated": true,
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "version": "$(git describe --tags 2>/dev/null || echo 'latest')",
  "message": "تم تحديث النظام - يُرجى إعادة تحميل الصفحة للحصول على أحدث نسخة"
}
EOF
    
    info "تم إنشاء ملف الإشعار"
}

# ═══════════════════════════════════════════════════════════
# الخطوة 11: التراجع التلقائي في حالة الفشل
# ═══════════════════════════════════════════════════════════

rollback() {
    error "🔄 بدء التراجع إلى النسخة السابقة..."
    
    # استعادة الملفات
    info "استعادة الملفات..."
    tar -xzf $BACKUP_DIR/pre-deployment-$DATE/app.tar.gz -C $APP_DIR/
    
    # استعادة قاعدة البيانات
    info "استعادة قاعدة البيانات..."
    mongorestore --db=itam_system --drop \
        $BACKUP_DIR/pre-deployment-$DATE/db/itam_system
    
    # إعادة تشغيل
    pm2 restart $APP_NAME
    
    error "❌ تم التراجع إلى النسخة السابقة"
    exit 1
}

# ═══════════════════════════════════════════════════════════
# البرنامج الرئيسي
# ═══════════════════════════════════════════════════════════

main() {
    echo ""
    echo "╔════════════════════════════════════════════════════╗"
    echo "║   🚀 بدء عملية التحديث المباشر                    ║"
    echo "║   📅 $(date +'%Y-%m-%d %H:%M:%S')                  ║"
    echo "╚════════════════════════════════════════════════════╝"
    echo ""
    
    # تنفيذ الخطوات
    check_environment || exit 1
    create_backup || exit 1
    pull_updates || warning "فشل سحب التحديثات"
    run_migrations || warning "فشل تشغيل Migrations"
    update_dependencies || { error "فشل تحديث Dependencies"; rollback; }
    build_frontend || { error "فشل بناء Frontend"; rollback; }
    reload_backend || { error "فشل إعادة تشغيل Backend"; rollback; }
    reload_nginx || warning "فشل تحديث Nginx"
    
    # فحص الصحة
    if health_check; then
        notify_users
        
        echo ""
        echo "╔════════════════════════════════════════════════════╗"
        echo "║   ✅ تم التحديث بنجاح!                            ║"
        echo "║   🕐 المدة: $SECONDS ثانية                        ║"
        echo "║   📊 النسخة الاحتياطية: $DATE                    ║"
        echo "╚════════════════════════════════════════════════════╝"
        echo ""
        
        # عرض معلومات مفيدة
        info "الأوامر المفيدة:"
        echo "  - مراقبة السجلات: pm2 logs $APP_NAME"
        echo "  - حالة التطبيق: pm2 status"
        echo "  - التراجع: mongorestore --db=itam_system $BACKUP_DIR/pre-deployment-$DATE/db/itam_system"
        
    else
        rollback
    fi
}

# تنفيذ
main "$@"
