#!/bin/bash

# نسخ احتياطي سريع للنظام

BACKUP_DIR="/var/backups/itam-system"
DATE=$(date +%Y%m%d_%H%M%S)
APP_DIR="/var/www/itam-system"

echo "🔄 بدء النسخ الاحتياطي..."

# إنشاء مجلد النسخ
mkdir -p $BACKUP_DIR

# 1. نسخ قاعدة البيانات
echo "📦 نسخ قاعدة البيانات..."
mongodump --db=itam_system --out=$BACKUP_DIR/mongo_$DATE

# 2. نسخ الملفات المرفوعة
echo "📁 نسخ الملفات..."
if [ -d "$APP_DIR/server/uploads" ]; then
    tar -czf $BACKUP_DIR/files_$DATE.tar.gz $APP_DIR/server/uploads
fi

# 3. نسخ الإعدادات
echo "⚙️  نسخ الإعدادات..."
cp $APP_DIR/server/.env $BACKUP_DIR/env_$DATE.backup

# 4. حذف النسخ القديمة (أكثر من 30 يوم)
echo "🗑️  حذف النسخ القديمة..."
find $BACKUP_DIR -type f -mtime +30 -delete
find $BACKUP_DIR -type d -empty -delete

# 5. عرض النتيجة
BACKUP_SIZE=$(du -sh $BACKUP_DIR/mongo_$DATE | cut -f1)
echo ""
echo "✅ تم النسخ الاحتياطي بنجاح!"
echo "📊 الحجم: $BACKUP_SIZE"
echo "📍 الموقع: $BACKUP_DIR"
echo "🕒 الوقت: $(date)"
