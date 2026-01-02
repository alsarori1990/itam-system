# 🐳 تشغيل النظام باستخدام Docker

## المتطلبات:
- Docker
- Docker Compose

## الخطوات:

### 1. إعداد البيئة
```bash
# إنشاء ملف .env
cp server/.env.example server/.env

# تعديل المتغيرات
nano server/.env
```

### 2. بناء وتشغيل الحاويات
```bash
# بناء الصور
docker-compose build

# تشغيل الخدمات
docker-compose up -d

# مشاهدة السجلات
docker-compose logs -f
```

### 3. التحقق من التشغيل
```bash
# التحقق من الحالة
docker-compose ps

# اختبار API
curl http://localhost:5000/health

# اختبار Frontend
curl http://localhost:80
```

### 4. الأوامر المفيدة
```bash
# إيقاف الخدمات
docker-compose down

# إعادة البناء والتشغيل
docker-compose up -d --build

# عرض السجلات
docker-compose logs backend
docker-compose logs mongodb

# الدخول إلى الحاوية
docker-compose exec backend sh
docker-compose exec mongodb mongosh
```

### 5. النسخ الاحتياطي مع Docker
```bash
# نسخ قاعدة البيانات
docker-compose exec mongodb mongodump --out=/data/backup

# استخراج النسخة
docker cp itam-mongodb:/data/backup ./backup
```

### 6. التحديث
```bash
# سحب التحديثات
git pull

# إعادة البناء
docker-compose up -d --build

# التنظيف
docker system prune -a
```

## الهيكل:
```
.
├── docker-compose.yml      # تكوين الخدمات
├── server/
│   ├── Dockerfile         # صورة Backend
│   └── ...
├── dist/                  # Frontend (بعد البناء)
└── nginx.conf            # تكوين Nginx
```

## المنافذ:
- Frontend: http://localhost:80
- Backend API: http://localhost:5000
- MongoDB: localhost:27017

## المجلدات الدائمة:
- mongodb_data: بيانات MongoDB
- uploads: الملفات المرفوعة

## ملاحظات:
- غيّر كلمات المرور في docker-compose.yml
- استخدم .env للإعدادات الحساسة
- للإنتاج: أضف SSL وأمان إضافي
