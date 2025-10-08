# AI Proctor - Installation Checklist

Use this checklist to track your installation progress for Windows environment.

## ✅ Prerequisites Installation

### Software Downloads

- [ ] Downloaded Python 3.10.11 Windows installer from python.org
- [ ] Downloaded Node.js 22.x LTS Windows installer from nodejs.org
- [ ] Downloaded XAMPP for Windows from apachefriends.org
- [ ] Downloaded CMake Windows installer from cmake.org
- [ ] Downloaded FFmpeg Windows build from ffmpeg.org

### Software Installation

- [ ] Installed Python 3.10.11 (✓ Added to PATH)
- [ ] Verified Python version: `python --version` shows 3.10.x
- [ ] Installed Node.js 22.x (with npm)
- [ ] Verified Node version: `node --version` shows v22.x.x
- [ ] Verified npm version: `npm --version` shows 10.x.x+
- [ ] Installed CMake (✓ Added to PATH)
- [ ] Verified CMake: `cmake --version` works
- [ ] Installed FFmpeg (extracted to C:\ffmpeg)
- [ ] Added FFmpeg to PATH (C:\ffmpeg\bin)
- [ ] Verified FFmpeg: `ffmpeg -version` works
- [ ] Installed XAMPP to C:\xampp

## ✅ Database Setup

- [ ] Started XAMPP Control Panel
- [ ] Started MySQL service (green status)
- [ ] Opened phpMyAdmin (http://localhost/phpmyadmin)
- [ ] Created database named "test"
- [ ] Verified database appears in phpMyAdmin

## ✅ Python Environment Setup

### Virtual Environment

- [ ] Opened Command Prompt
- [ ] Navigated to AI-Model directory
- [ ] Created virtual environment: `python -m venv venv`
- [ ] Verified venv folder exists in AI-Model
- [ ] Activated virtual environment: `venv\Scripts\activate`
- [ ] See (venv) prefix in command prompt
- [ ] Upgraded pip: `pip install --upgrade pip setuptools wheel`

### Python Dependencies

- [ ] Attempted: `pip install -r requirements.txt`
- [ ] If dlib failed:
  - [ ] Downloaded dlib wheel for Python 3.10
  - [ ] Installed dlib wheel manually
  - [ ] Re-ran: `pip install -r requirements.txt`
- [ ] Verified imports work:
  ```
  python -c "import cv2, mediapipe, dlib, face_recognition; print('OK')"
  ```
- [ ] Result shows "OK"

### Model Files

- [ ] Verified MobileFaceNet.onnx exists in AI-Model
- [ ] Verified yolo11n.onnx exists in AI-Model
- [ ] Verified final.pt exists in AI-Model (or will download on first run)

## ✅ Backend Setup

- [ ] Opened new Command Prompt
- [ ] Navigated to backend directory
- [ ] Ran: `npm install`
- [ ] Installation completed without errors
- [ ] Created .env file in backend directory
- [ ] Added all required environment variables:
  - [ ] SERVER_IP_ADDRESS=localhost
  - [ ] PORT=3001
  - [ ] DB_NAME=test
  - [ ] DB_USER=root
  - [ ] DB_PASSWORD= (empty)
  - [ ] DB_HOST=localhost
  - [ ] DB_PORT=3306
  - [ ] JWT_SECRET=<your-secret-key>
- [ ] Saved .env file

## ✅ Frontend Setup

- [ ] Opened new Command Prompt
- [ ] Navigated to face-scanning directory
- [ ] Ran: `npm install`
- [ ] Installation completed without errors

## ✅ Storage Service Setup

- [ ] Opened new Command Prompt
- [ ] Navigated to storage directory
- [ ] Ran: `npm install`
- [ ] Installation completed without errors

## ✅ Service Startup Test

### Terminal 1: Database

- [ ] XAMPP Control Panel open
- [ ] MySQL showing green "Running" status

### Terminal 2: Backend

- [ ] Navigated to backend directory
- [ ] Ran: `npm run dev`
- [ ] Saw: "✅ Database connected and synced!"
- [ ] Saw: Server running on port 3001
- [ ] No errors in console

### Terminal 3: Storage

- [ ] Navigated to storage directory
- [ ] Ran: `npm run dev`
- [ ] Service started successfully
- [ ] No errors in console

### Terminals 4-9: Python Services

#### Option A: Automated (Recommended)

- [ ] Navigated to Ai-Proctor root directory
- [ ] Ran: `start-services-windows.bat`
- [ ] 6 Command Prompt windows opened
- [ ] Each window shows service starting

#### Option B: Manual

- [ ] Terminal 4: Started auth_service.py
- [ ] Terminal 5: Started eye_service.py
- [ ] Terminal 6: Started webdetect_service.py
- [ ] Terminal 7: Started head_service.py
- [ ] Terminal 8: Started mobile_service.py
- [ ] Terminal 9: Started store_service.py

#### Verification

- [ ] Auth Service shows: "Connected to server"
- [ ] Eye Service shows: "Connected to server"
- [ ] WebDetect Service shows: "Connected to server"
- [ ] Head Service shows: "Connected to server"
- [ ] Mobile Service shows: "Connected to server"
- [ ] Store Service shows: "Connected to server"

### Terminal 10: Frontend

- [ ] Navigated to face-scanning directory
- [ ] Ran: `npm run dev`
- [ ] Saw: "Ready" message
- [ ] Saw: Running on https://localhost:3000

## ✅ Application Access

- [ ] Opened browser (Chrome/Edge recommended)
- [ ] Navigated to: https://localhost:3000
- [ ] Accepted certificate warning:
  - [ ] Clicked "Advanced"
  - [ ] Clicked "Proceed to localhost (unsafe)"
- [ ] Application loaded successfully
- [ ] Can see login/authentication page
- [ ] Camera permissions requested (if applicable)

## ✅ Functionality Tests

- [ ] Can register/authenticate with face
- [ ] Camera feed visible
- [ ] Eye tracking working
- [ ] Head pose detection working
- [ ] Web detection working
- [ ] Mobile detection working
- [ ] No console errors in browser

## 📊 Service Status Summary

At this point, you should have:

- ✅ 10 terminals/windows running
- ✅ All services connected and operational
- ✅ Frontend accessible at https://localhost:3000
- ✅ Backend API responding at https://localhost:3001
- ✅ Database "test" active in MySQL
- ✅ All Python services connected via Socket.IO

## 🐛 Common Issues Encountered

Track any issues you encountered:

1. Issue: ******\*\*\*\*******\_\_\_******\*\*\*\*******
   Solution: ******\*\*\*\*******\_******\*\*\*\*******

2. Issue: ******\*\*\*\*******\_\_\_******\*\*\*\*******
   Solution: ******\*\*\*\*******\_******\*\*\*\*******

3. Issue: ******\*\*\*\*******\_\_\_******\*\*\*\*******
   Solution: ******\*\*\*\*******\_******\*\*\*\*******

## 📝 Notes

Installation Date: ****\*\*****\_\_\_****\*\*****

Installation Time (total): **\*\***\_\_\_**\*\*** hours

System Specs:

- OS: Windows \_\_\_\_
- RAM: **\_** GB
- CPU: **\*\*\*\***\_**\*\*\*\***
- GPU (if any): **\*\*\*\***\_**\*\*\*\***

Custom Configuration:

---

---

---

## 🎉 Installation Complete!

If all items are checked, your AI Proctor system is ready to use!

### Quick Start Commands (for future use):

```cmd
# Terminal 1: Start XAMPP MySQL (GUI)

# Terminal 2: Backend
cd backend && npm run dev

# Terminal 3: Storage
cd storage && npm run dev

# Terminal 4-9: Python Services (6 services)
start-services-windows.bat

# Terminal 10: Frontend
cd face-scanning && npm run dev
```

### Helpful Resources:

- Full Documentation: README.md
- Windows Guide: WINDOWS_SETUP.md
- Architecture: ARCHITECTURE.md
- Quick Reference: QUICK_REFERENCE.md

---

**Checklist Version**: 1.0
**Environment**: Windows 10/11
**Python**: 3.10.x
**Node.js**: 22.x
**Date**: October 2025
