# AI Proctor - Quick Reference Card

## 🖥️ Environment

```
Python: 3.10.x
Node.js: 22.x
Database: MySQL (XAMPP)
```

## 📦 Services (10 Total)

### Node.js Services (3)

1. Backend Server → `https://localhost:3001`
2. Storage Service → Default port
3. Frontend → `https://localhost:3000`

### Python Services (6)

1. auth_service.py
2. eye_service.py
3. webdetect_service.py
4. head_service.py
5. mobile_service.py
6. store_service.py

### Database (1)

1. MySQL via XAMPP → Port 3306

## ⚡ Quick Start

### Windows

```cmd
# 1. Start MySQL
XAMPP Control Panel → Start MySQL

# 2. Start Backend
cd backend
npm run dev

# 3. Start Storage
cd storage
npm run dev

# 4. Start Python Services (automated)
start-services-windows.bat

# 5. Start Frontend
cd face-scanning
npm run dev
```

## 📂 Project Structure

```
Ai-Proctor/
├── AI-Model/           # Python services
│   ├── auth_service.py
│   ├── eye_service.py
│   ├── webdetect_service.py
│   ├── head_service.py
│   ├── mobile_service.py
│   ├── store_service.py
│   ├── requirements.txt
│   └── venv/           # Virtual environment
├── backend/            # Node.js API
│   ├── server.ts
│   ├── .env
│   └── package.json
├── face-scanning/      # Next.js frontend
│   └── package.json
└── storage/            # Storage service
    └── package.json
```

## 🔧 Common Commands

### Python Virtual Environment

```cmd
# Activate
venv\Scripts\activate

# Deactivate
deactivate

# Install packages
pip install -r requirements.txt
```

### Node.js

```cmd
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

### Database

```cmd
# Access phpMyAdmin
http://localhost/phpmyadmin

# Database name
test
```

## 🐛 Troubleshooting

### Check Running Services

```cmd
# Check if port is in use
netstat -ano | findstr :3001

# Kill process
taskkill /PID <process_id> /F
```

### Verify Installations

```cmd
python --version    # 3.10.x
node --version      # v22.x.x
npm --version       # 10.x.x+
cmake --version
ffmpeg -version
```

### Python Package Check

```cmd
cd AI-Model
venv\Scripts\activate
python -c "import cv2, mediapipe, dlib, face_recognition; print('OK')"
```

## 📝 Configuration Files

### Backend .env

```env
SERVER_IP_ADDRESS=localhost
PORT=3001
DB_NAME=test
DB_USER=root
DB_PASSWORD=
DB_HOST=localhost
DB_PORT=3306
JWT_SECRET=your-secret-key
```

## 🔗 Access Points

| Service     | URL                         |
| ----------- | --------------------------- |
| Frontend    | https://localhost:3000      |
| Backend API | https://localhost:3001      |
| phpMyAdmin  | http://localhost/phpmyadmin |

## 🆘 Help

- Full Guide: [README.md](./README.md)
- Windows Setup: [WINDOWS_SETUP.md](./WINDOWS_SETUP.md)
- Setup Summary: [SETUP_SUMMARY.md](./SETUP_SUMMARY.md)

## 📋 Startup Checklist

- [ ] MySQL running (XAMPP)
- [ ] Backend running (npm run dev)
- [ ] Storage running (npm run dev)
- [ ] 6 Python services running
- [ ] Frontend running (npm run dev)
- [ ] Access https://localhost:3000 ✅
