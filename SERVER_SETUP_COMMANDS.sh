# على السيرفر - نفذ هذه الأوامر

# الخطوة 1: استنساخ المشروع من GitHub
cd /var/www

# استخدم أحد الطرق التالية للاستنساخ:
# الطريقة 1: مع Personal Access Token (الأمان أفضل)
# git clone https://alsarori1990:YOUR_TOKEN@github.com/alsarori1990/itam-system.git itam-system

# الطريقة 2: إذا جعلت المستودع عام مؤقتاً (أسهل للتجربة)
git clone https://github.com/alsarori1990/itam-system.git itam-system

cd itam-system

# الخطوة 2: إنشاء ملف .env
cat > server/.env << 'EOF'
# Server Configuration
NODE_ENV=production
PORT=5000
HOST=0.0.0.0

# Database
MONGODB_URI=mongodb://localhost:27017/itam_system

# JWT
JWT_SECRET=a8f9c2d4e6b1f3a7c9e2d5b8f1a4c7e9d2b5f8a1c4e7d0b3f6a9c2e5d8b1f4a7
JWT_EXPIRE=7d

# CORS
CORS_ORIGIN=http://72.62.149.231

# Rate Limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_PATH=/var/www/itam-system/server/uploads

# API Keys
GEMINI_API_KEY=
EOF

# الخطوة 3: تثبيت Dependencies
npm install
cd server
npm install
cd ..

# الخطوة 4: بناء Frontend
npm run build

# الخطوة 5: إنشاء مجلد uploads
mkdir -p server/uploads
chmod 755 server/uploads

# الخطوة 6: تشغيل Backend بـ PM2
cd server
pm2 start server.js --name itam-backend
pm2 save

# الخطوة 7: التحقق
pm2 status
curl http://localhost:5000/health
