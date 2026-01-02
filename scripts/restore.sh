#!/bin/bash

# استعادة النسخة الاحتياطية

BACKUP_DIR="/var/backups/itam-system"
APP_DIR="/var/www/itam-system"

echo "⚠️  استعادة النسخة الاحتياطية"
echo "================================"

# عرض النسخ المتوفرة
echo "📋 النسخ الاحتياطية المتوفرة:"
ls -lh $BACKUP_DIR | grep mongo

echo ""
read -p "أدخل تاريخ النسخة (مثال: 20260102_030000): " BACKUP_DATE

if [ ! -d "$BACKUP_DIR/mongo_$BACKUP_DATE" ]; then
    echo "❌ النسخة غير موجودة!"
    exit 1
fi

read -p "هل أنت متأكد من الاستعادة؟ (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "❌ تم الإلغاء"
    exit 0
fi

# إيقاف التطبيق
echo "⏸️  إيقاف التطبيق..."
pm2 stop itam-backend

# استعادة قاعدة البيانات
echo "📥 استعادة قاعدة البيانات..."
mongorestore --db=itam_system --drop $BACKUP_DIR/mongo_$BACKUP_DATE/itam_system

# استعادة الملفات
if [ -f "$BACKUP_DIR/files_$BACKUP_DATE.tar.gz" ]; then
    echo "📁 استعادة الملفات..."
    tar -xzf $BACKUP_DIR/files_$BACKUP_DATE.tar.gz -C /
fi

# استعادة الإعدادات
if [ -f "$BACKUP_DIR/env_$BACKUP_DATE.backup" ]; then
    echo "⚙️  استعادة الإعدادات..."
    cp $BACKUP_DIR/env_$BACKUP_DATE.backup $APP_DIR/server/.env
fi

# إعادة تشغيل التطبيق
echo "▶️  إعادة تشغيل التطبيق..."
pm2 restart itam-backend

echo ""
echo "✅ تمت الاستعادة بنجاح!"
echo "🔍 تحقق من: pm2 logs itam-backend"
