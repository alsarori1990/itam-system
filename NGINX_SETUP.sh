#!/bin/bash
# إعداد Nginx لخدمة التطبيق

echo "🌐 إعداد Nginx..."

# إنشاء ملف إعداد الموقع
cat > /etc/nginx/sites-available/itam-system << 'EOF'
server {
    listen 80;
    server_name 72.62.149.231;

    # Frontend (static files)
    location / {
        root /var/www/itam-system/dist;
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:5000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
    }

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
}
EOF

# تفعيل الموقع
ln -sf /etc/nginx/sites-available/itam-system /etc/nginx/sites-enabled/

# حذف الموقع الافتراضي
rm -f /etc/nginx/sites-enabled/default

# اختبار إعداد Nginx
nginx -t

# إعادة تشغيل Nginx
systemctl restart nginx
systemctl enable nginx

echo "✅ تم إعداد Nginx بنجاح!"
echo "🌍 يمكنك الآن الوصول للتطبيق على: http://72.62.149.231"