#!/bin/bash
echo "=== تشخيص شامل للسيرفر ==="
echo "التاريخ والوقت: $(date)"
echo "================================"

echo ""
echo "1. معلومات النظام:"
echo "-------------------"
uname -a
cat /etc/os-release | grep -E '^NAME=|^VERSION='
uptime

echo ""
echo "2. استخدام الموارد:"
echo "------------------"
free -h
df -h /
df -h /var/www

echo ""
echo "3. حالة الخدمات المطلوبة:"
echo "------------------------"
echo "MongoDB:"
systemctl is-active mongod || systemctl is-active mongodb
systemctl status mongod --no-pager -l | head -10 || systemctl status mongodb --no-pager -l | head -10

echo ""
echo "Node.js:"
node --version 2>/dev/null || echo "Node.js غير مثبت"
npm --version 2>/dev/null || echo "npm غير مثبت"

echo ""
echo "PM2:"
which pm2 && pm2 --version || echo "PM2 غير مثبت"
pm2 status 2>/dev/null || echo "لا توجد عمليات PM2"

echo ""
echo "Nginx:"
systemctl is-active nginx
nginx -t 2>&1 || echo "Nginx غير مثبت أو به أخطاء"

echo ""
echo "4. حالة المشروع:"
echo "----------------"
if [ -d "/var/www/itam-system" ]; then
    echo "✅ مجلد المشروع موجود"
    cd /var/www/itam-system
    
    echo "محتويات المجلد:"
    ls -la
    
    echo ""
    echo "حالة package.json:"
    if [ -f "package.json" ]; then
        echo "✅ package.json موجود"
    else
        echo "❌ package.json مفقود"
    fi
    
    echo ""
    echo "حالة ملف .env:"
    if [ -f "server/.env" ]; then
        echo "✅ server/.env موجود"
        echo "محتوى .env (بدون المفاتيح السرية):"
        cat server/.env | grep -v "SECRET\|KEY\|PASSWORD"
    else
        echo "❌ server/.env مفقود"
    fi
    
    echo ""
    echo "حالة node_modules:"
    if [ -d "node_modules" ]; then
        echo "✅ node_modules للمشروع الرئيسي موجود"
    else
        echo "❌ node_modules للمشروع الرئيسي مفقود"
    fi
    
    if [ -d "server/node_modules" ]; then
        echo "✅ node_modules للـ server موجود"
    else
        echo "❌ node_modules للـ server مفقود"
    fi
    
    echo ""
    echo "حالة dist folder:"
    if [ -d "dist" ]; then
        echo "✅ مجلد dist موجود"
        ls -la dist/ | head -5
    else
        echo "❌ مجلد dist مفقود (لم يتم بناء Frontend)"
    fi
    
else
    echo "❌ مجلد المشروع /var/www/itam-system غير موجود"
fi

echo ""
echo "5. فحص المنافذ:"
echo "---------------"
echo "المنافذ المستخدمة:"
netstat -tlnp | grep -E ':5000|:80|:443|:27017'

echo ""
echo "6. آخر أخطاء النظام:"
echo "-------------------"
journalctl --since "1 hour ago" --priority=err --no-pager | tail -10

echo ""
echo "7. مساحة القرص:"
echo "---------------"
du -sh /var/www/* 2>/dev/null || echo "لا توجد ملفات في /var/www"

echo ""
echo "8. متغيرات البيئة المهمة:"
echo "-------------------------"
echo "PATH: $PATH"
echo "NODE_ENV: $NODE_ENV"

echo ""
echo "================================"
echo "انتهى التشخيص"
echo "================================"