# AI Proctor - Windows Setup Guide

Complete setup instructions for running AI Proctor on Windows with Python 3.10 and Node.js 22.

## 📋 Prerequisites

### Required Software Versions

- **Python**: 3.10.x (specifically 3.10.11 recommended)
- **Node.js**: 22.x LTS
- **MySQL**: via XAMPP
- **Git**: Latest version (optional, for cloning)

---

## 🔧 Step-by-Step Installation

### Step 1: Install Python 3.10

1. **Download Python 3.10.11**

   - Visit: https://www.python.org/downloads/windows/
   - Scroll to find "Python 3.10.11"
   - Download "Windows installer (64-bit)"

2. **Install Python**

   - Run the downloaded installer
   - ✅ **CRITICAL**: Check "Add Python 3.10 to PATH"
   - ✅ Check "Install pip"
   - Click "Install Now"
   - Wait for installation to complete

3. **Verify Installation**

   ```cmd
   python --version
   ```

   Should output: `Python 3.10.11`

   ```cmd
   pip --version
   ```

   Should show pip version for Python 3.10

### Step 2: Install Node.js 22

1. **Download Node.js 22.x LTS**

   - Visit: https://nodejs.org/en/download/
   - Download "Windows Installer (.msi)" for LTS version 22.x
   - Choose 64-bit installer

2. **Install Node.js**

   - Run the .msi installer
   - Accept license agreement
   - Use default installation path: `C:\Program Files\nodejs\`
   - Install with default settings (includes npm)
   - Complete installation

3. **Verify Installation**

   ```cmd
   node --version
   ```

   Should output: `v22.x.x`

   ```cmd
   npm --version
   ```

   Should output: `10.x.x` or higher

### Step 3: Install CMake

1. **Download CMake**

   - Visit: https://cmake.org/download/
   - Download "Windows x64 Installer" (cmake-x.xx.x-windows-x86_64.msi)

2. **Install CMake**

   - Run the installer
   - ✅ **IMPORTANT**: Select "Add CMake to system PATH for all users"
   - Complete installation

3. **Verify Installation**
   ```cmd
   cmake --version
   ```
   Should display CMake version

### Step 4: Install FFmpeg

1. **Download FFmpeg**

   - Visit: https://ffmpeg.org/download.html
   - Click "Windows builds by BtbN"
   - Download the latest release (ffmpeg-master-latest-win64-gpl.zip)

2. **Extract and Install**

   - Extract the ZIP file
   - Rename folder to `ffmpeg`
   - Move folder to `C:\ffmpeg`

3. **Add to PATH**

   - Right-click "This PC" → Properties
   - Click "Advanced system settings"
   - Click "Environment Variables"
   - Under "System variables", find and select "Path"
   - Click "Edit" → "New"
   - Add: `C:\ffmpeg\bin`
   - Click "OK" on all dialogs

4. **Verify Installation**
   - Open NEW Command Prompt (important!)
   ```cmd
   ffmpeg -version
   ```
   Should display FFmpeg version

### Step 5: Install XAMPP

1. **Download XAMPP**

   - Visit: https://www.apachefriends.org/download.html
   - Download the latest Windows version

2. **Install XAMPP**

   - Run installer as Administrator
   - Install to default location: `C:\xampp`
   - Select "Apache" and "MySQL" components
   - Complete installation

3. **Start MySQL**

   - Open XAMPP Control Panel
   - Click "Start" next to MySQL
   - MySQL should show green "Running" status

4. **Create Database**
   - Open browser → http://localhost/phpmyadmin
   - Click "New" in left sidebar
   - Database name: `test`
   - Collation: `utf8mb4_general_ci`
   - Click "Create"

---

## 📦 Project Setup

### Step 6: Setup Python Environment

1. **Open Command Prompt**

   ```cmd
   cd C:\path\to\your\Ai-Proctor\AI-Model
   ```

   (Replace with your actual project path)

2. **Create Virtual Environment**

   ```cmd
   python -m venv venv
   ```

3. **Activate Virtual Environment**

   ```cmd
   venv\Scripts\activate
   ```

   You should see `(venv)` at the start of your prompt

4. **Upgrade pip**

   ```cmd
   pip install --upgrade pip setuptools wheel
   ```

5. **Install Requirements**

   **Option A: Try direct installation first**

   ```cmd
   pip install -r requirements.txt
   ```

   **Option B: If dlib fails, use pre-built wheel**

   a. Download pre-built dlib wheel:

   - Visit: https://github.com/jloh02/dlib/releases
   - Download: `dlib-19.24.0-cp310-cp310-win_amd64.whl`
   - Save to AI-Model folder

   b. Install dlib manually:

   ```cmd
   pip install dlib-19.24.0-cp310-cp310-win_amd64.whl
   ```

   c. Install remaining requirements:

   ```cmd
   pip install -r requirements.txt
   ```

6. **Verify Python Packages**
   ```cmd
   python -c "import cv2; import mediapipe; import dlib; import face_recognition; print('✅ All packages OK!')"
   ```

### Step 7: Setup Backend (Node.js)

1. **Open NEW Command Prompt**

   ```cmd
   cd C:\path\to\your\Ai-Proctor\backend
   ```

2. **Install Dependencies**

   ```cmd
   npm install
   ```

3. **Create .env File**

   Create file: `backend\.env`

   Add this content:

   ```env
   # Server Configuration
   SERVER_IP_ADDRESS=localhost
   PORT=3001

   # Database Configuration
   DB_NAME=test
   DB_USER=root
   DB_PASSWORD=
   DB_HOST=localhost
   DB_PORT=3306

   # JWT Secret
   JWT_SECRET=change-this-to-random-secret-key

   # SSL Certificates
   SSL_KEY_PATH=./localhost-key.pem
   SSL_CERT_PATH=./localhost-cert.pem
   ```

### Step 8: Setup Frontend (Next.js)

1. **Open NEW Command Prompt**

   ```cmd
   cd C:\path\to\your\Ai-Proctor\face-scanning
   ```

2. **Install Dependencies**
   ```cmd
   npm install
   ```

### Step 9: Setup Storage Service

1. **Open NEW Command Prompt**

   ```cmd
   cd C:\path\to\your\Ai-Proctor\storage
   ```

2. **Install Dependencies**
   ```cmd
   npm install
   ```

---

## 🚀 Running the Application

### Required Terminals: 10 Total

You need to run 10 services simultaneously:

1. XAMPP MySQL (via Control Panel)
2. Backend Server
3. Storage Service
   4-9. Six Python Services
4. Frontend

### Starting Services

#### Terminal 1: XAMPP MySQL

- Open XAMPP Control Panel
- Click "Start" next to MySQL
- Keep Control Panel open

#### Terminal 2: Backend Server

```cmd
cd C:\path\to\your\Ai-Proctor\backend
npm run dev
```

Wait for: `✅ Database connected and synced!`

#### Terminal 3: Storage Service

```cmd
cd C:\path\to\your\Ai-Proctor\storage
npm run dev
```

#### Terminals 4-9: Python Services

**OPTION A: Manual Start (6 terminals)**

**Terminal 4: Auth Service**

```cmd
cd C:\path\to\your\Ai-Proctor\AI-Model
venv\Scripts\activate
python auth_service.py
```

**Terminal 5: Eye Service**

```cmd
cd C:\path\to\your\Ai-Proctor\AI-Model
venv\Scripts\activate
python eye_service.py
```

**Terminal 6: WebDetect Service**

```cmd
cd C:\path\to\your\Ai-Proctor\AI-Model
venv\Scripts\activate
python webdetect_service.py
```

**Terminal 7: Head Service**

```cmd
cd C:\path\to\your\Ai-Proctor\AI-Model
venv\Scripts\activate
python head_service.py
```

**Terminal 8: Mobile Service**

```cmd
cd C:\path\to\your\Ai-Proctor\AI-Model
venv\Scripts\activate
python mobile_service.py
```

**Terminal 9: Store Service**

```cmd
cd C:\path\to\your\Ai-Proctor\AI-Model
venv\Scripts\activate
python store_service.py
```

**OPTION B: Automated Start (recommended)**

Use the provided batch script:

```cmd
cd C:\path\to\your\Ai-Proctor
start-services-windows.bat
```

This will open 6 terminal windows automatically with all Python services.

#### Terminal 10: Frontend

```cmd
cd C:\path\to\your\Ai-Proctor\face-scanning
npm run dev
```

### Accessing the Application

- **Frontend**: https://localhost:3000
- **Backend API**: https://localhost:3001
- **phpMyAdmin**: http://localhost/phpmyadmin

**Browser Warning**: Accept the self-signed certificate warning:

- Click "Advanced"
- Click "Proceed to localhost (unsafe)"

---

## 🔍 Troubleshooting

### Python Issues

**Issue**: `python: command not found`

- Solution: Reinstall Python 3.10 and check "Add to PATH"
- Verify PATH in Environment Variables

**Issue**: Wrong Python version

```cmd
python --version
```

- If not 3.10.x, uninstall other Python versions or specify `py -3.10`

**Issue**: `dlib` won't install

- Download pre-built wheel from: https://github.com/jloh02/dlib/releases
- Use: `pip install dlib-19.24.0-cp310-cp310-win_amd64.whl`

**Issue**: `ImportError: DLL load failed`

- Install Visual C++ Redistributable: https://aka.ms/vs/17/release/vc_redist.x64.exe

### Node.js Issues

**Issue**: `node: command not found`

- Reinstall Node.js 22.x
- Restart Command Prompt after installation

**Issue**: `npm install` fails

- Try: `npm cache clean --force`
- Delete `node_modules` folder
- Run: `npm install` again

**Issue**: Port 3001 already in use

- Find process: `netstat -ano | findstr :3001`
- Kill process: `taskkill /PID <process_id> /F`

### Database Issues

**Issue**: MySQL won't start in XAMPP

- Port 3306 might be in use
- Check Task Manager for other MySQL services
- Stop conflicting services

**Issue**: Can't connect to database

- Verify MySQL is running (green in XAMPP)
- Check database `test` exists in phpMyAdmin
- Verify credentials in `backend\.env`

### FFmpeg Issues

**Issue**: `ffmpeg: command not found`

- Add `C:\ffmpeg\bin` to PATH
- Restart Command Prompt
- Verify: `ffmpeg -version`

---

## ✅ Verification Checklist

Before running the application:

- [ ] Python 3.10.x installed and in PATH
- [ ] Node.js 22.x installed and in PATH
- [ ] CMake installed and in PATH
- [ ] FFmpeg installed and in PATH
- [ ] XAMPP installed, MySQL running
- [ ] Database `test` created
- [ ] Virtual environment created in AI-Model
- [ ] All Python requirements installed
- [ ] Backend `npm install` completed
- [ ] Frontend `npm install` completed
- [ ] Storage `npm install` completed
- [ ] Backend `.env` file created
- [ ] All 10 services running
- [ ] Can access https://localhost:3000

---

## 📝 Quick Reference

### Service Ports

- Frontend: 3000 (HTTPS)
- Backend: 3001 (HTTPS)
- MySQL: 3306
- phpMyAdmin: 80

### Python Services

1. auth_service.py - Face authentication
2. eye_service.py - Eye tracking
3. webdetect_service.py - Web detection
4. head_service.py - Head pose
5. mobile_service.py - Mobile detection
6. store_service.py - Face data storage

### Common Commands

```cmd
# Activate Python venv
venv\Scripts\activate

# Deactivate venv
deactivate

# Check running processes
netstat -ano | findstr :3001

# Kill process
taskkill /PID <pid> /F
```

---

## 🆘 Getting Help

If you encounter issues:

1. Check this troubleshooting guide
2. Verify all prerequisites are installed correctly
3. Check terminal output for error messages
4. Ensure all services are running in correct order
5. Create GitHub issue with error details

---

**Document Version**: 1.0  
**Last Updated**: October 2025  
**Compatible with**: Windows 10/11, Python 3.10, Node.js 22
