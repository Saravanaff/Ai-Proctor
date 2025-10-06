# AI Proctor - Complete Installation Guide

A comprehensive AI-powered proctoring system with real-time monitoring capabilities including face recognition, eye tracking, head pose estimation, object detection, and multi-camera support.

## 📋 Table of Contents

- [System Architecture](#system-architecture)
- [Prerequisites](#prerequisites)
- [Installation Guide](#installation-guide)
  - [1. System Dependencies](#1-system-dependencies)
  - [2. Database Setup (XAMPP/MySQL)](#2-database-setup-xappmysql)
  - [3. Python Environment (AI-Model)](#3-python-environment-ai-model)
  - [4. Backend Setup (Node.js/TypeScript)](#4-backend-setup-nodejstypescript)
  - [5. Frontend Setup (Next.js)](#5-frontend-setup-nextjs)
  - [6. Storage Service Setup](#6-storage-service-setup)
- [Running the Application](#running-the-application)
- [Troubleshooting](#troubleshooting)
- [Project Structure](#project-structure)

---

## 🏗 System Architecture

The AI Proctor system consists of four main components:

1. **AI-Model** (Python) - Computer vision processing, face recognition, object detection
2. **Backend** (Node.js/TypeScript) - Main API server with MediaSoup for WebRTC
3. **Face-Scanning** (Next.js) - Frontend application for proctoring interface
4. **Storage** (Node.js) - Video/media storage and streaming service

---

## 🔧 Prerequisites

### Operating System

- **Linux** (Ubuntu 20.04+, Debian, Fedora) - Recommended
- **Windows 10/11** (with WSL2 for better compatibility)
- **macOS** (Catalina or later)

### Minimum Hardware

- **CPU**: Intel Core i5 or AMD Ryzen 5 (8th gen or newer)
- **RAM**: 8 GB minimum, 16 GB recommended
- **Storage**: 10 GB free space
- **Camera**: Webcam or external camera
- **GPU**: Optional (NVIDIA GPU with CUDA for better performance)

---

## 📦 Installation Guide

### 1. System Dependencies

#### 1.1 Install FFmpeg

FFmpeg is required for video processing and streaming.

##### Linux (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install ffmpeg -y

# Verify installation
ffmpeg -version
```

##### Linux (Fedora)

```bash
sudo dnf install ffmpeg -y
ffmpeg -version
```

##### macOS

```bash
# Install Homebrew first if not installed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install FFmpeg
brew install ffmpeg
ffmpeg -version
```

##### Windows

1. Download FFmpeg from: https://ffmpeg.org/download.html
2. Extract to `C:\ffmpeg`
3. Add `C:\ffmpeg\bin` to System PATH:
   - Right-click "This PC" → Properties → Advanced System Settings
   - Environment Variables → System Variables → Path → Edit
   - Add new entry: `C:\ffmpeg\bin`
4. Verify in Command Prompt:

```cmd
ffmpeg -version
```

#### 1.2 Install CMake (Required for dlib)

##### Linux (Ubuntu/Debian)

```bash
sudo apt install cmake build-essential -y
```

##### macOS

```bash
brew install cmake
```

##### Windows

Download from: https://cmake.org/download/

- Install and add to PATH during installation

#### 1.3 Install Python 3.11

##### Linux (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install python3.11 python3.11-venv python3.11-dev python3-pip -y

# Set Python 3.11 as default (optional)
sudo update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.11 1
```

##### macOS

```bash
brew install python@3.11
```

##### Windows

Download from: https://www.python.org/downloads/

- Download Python 3.11.x installer
- Check "Add Python to PATH" during installation

Verify:

```bash
python3 --version  # Should show Python 3.11.x
```

#### 1.4 Install Node.js and npm

##### Linux (Ubuntu/Debian)

```bash
# Install Node.js 20.x LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install nodejs -y

# Verify
node --version  # Should be v20.x.x
npm --version
```

##### macOS

```bash
brew install node@20
```

##### Windows

Download from: https://nodejs.org/

- Download LTS version (20.x)
- Install with default settings

Verify:

```bash
node --version
npm --version
```

---

### 2. Database Setup (XAMPP/MySQL)

#### 2.1 Install XAMPP

##### Linux (Ubuntu/Debian)

```bash
# Download XAMPP
cd /tmp
wget https://www.apachefriends.org/xampp-files/8.2.12/xampp-linux-x64-8.2.12-0-installer.run

# Make installer executable
chmod +x xampp-linux-x64-8.2.12-0-installer.run

# Run installer (may require sudo)
sudo ./xampp-linux-x64-8.2.12-0-installer.run

# Start XAMPP
sudo /opt/lampp/lampp start
```

##### macOS

```bash
# Download from: https://www.apachefriends.org/download.html
# Install the .dmg file
# Or use Homebrew alternative:
brew install --cask xampp
```

##### Windows

1. Download XAMPP from: https://www.apachefriends.org/download.html
2. Run installer as Administrator
3. Choose installation directory (default: `C:\xampp`)
4. Install Apache and MySQL
5. Launch XAMPP Control Panel

#### 2.2 Start MySQL

##### Linux

```bash
sudo /opt/lampp/lampp startmysql
# Or start entire XAMPP
sudo /opt/lampp/lampp start
```

##### Windows

- Open XAMPP Control Panel
- Click "Start" next to MySQL

#### 2.3 Create Database

Open your browser and navigate to: `http://localhost/phpmyadmin`

```sql
-- Create database
CREATE DATABASE test;

-- Create user (if needed)
CREATE USER 'root'@'localhost' IDENTIFIED BY '';
GRANT ALL PRIVILEGES ON test.* TO 'root'@'localhost';
FLUSH PRIVILEGES;
```

Or use command line:

```bash
# Linux/macOS
mysql -u root -p

# Windows (from XAMPP shell)
mysql -u root

# Then run SQL commands
CREATE DATABASE test;
```

The backend will automatically create tables on first run using Sequelize migrations.

---

### 3. Python Environment (AI-Model)

#### 3.1 Navigate to AI-Model Directory

```bash
cd /home/raghul/projects/cdc/Ai-Proctor/AI-Model
```

#### 3.2 Create Virtual Environment

```bash
# Create virtual environment
python3.11 -m venv venv

# Activate virtual environment
# Linux/macOS:
source venv/bin/activate

# Windows:
venv\Scripts\activate
```

#### 3.3 Upgrade pip

```bash
pip install --upgrade pip setuptools wheel
```

#### 3.4 Install System Dependencies for dlib (Linux only)

```bash
# Ubuntu/Debian
sudo apt install libopenblas-dev liblapack-dev libx11-dev libgtk-3-dev -y
```

#### 3.5 Install Python Requirements

```bash
# Install all requirements
pip install -r requirements.txt
```

**Note for Windows Users**: If you encounter issues with `dlib`:

1. Download pre-built wheel from: https://github.com/jloh02/dlib/releases
2. Install: `pip install dlib-19.24.0-cp311-cp311-win_amd64.whl`

#### 3.6 Verify Installation

```bash
python -c "import cv2; import mediapipe; import dlib; import face_recognition; print('✅ All packages installed successfully!')"
```

#### 3.7 Download Model Files

The following model files should be present (auto-downloaded on first run):

- `final.pt` - Face recognition model
- `MobileFaceNet.onnx` - Face detection model
- `yolo11n.onnx` - Object detection model (YOLO)
- `yolov8n.pt` - Alternative YOLO model
- `yolov8m.pt` - Medium YOLO model

---

### 4. Backend Setup (Node.js/TypeScript)

#### 4.1 Navigate to Backend Directory

```bash
cd /home/raghul/projects/cdc/Ai-Proctor/backend
```

#### 4.2 Install Dependencies

```bash
npm install
```

#### 4.3 Environment Configuration

Create a `.env` file in the backend directory:

```bash
touch .env
```

Add the following configuration:

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
JWT_SECRET=your-secret-key-change-this

# SSL Certificates (auto-generated)
SSL_KEY_PATH=./localhost-key.pem
SSL_CERT_PATH=./localhost-cert.pem
```

#### 4.4 Generate SSL Certificates

The backend uses HTTPS with self-signed certificates:

```bash
# Certificates will be auto-generated on first run
# Or manually generate:
npx mkcert create-ca
npx mkcert create-cert
```

#### 4.5 Build TypeScript

```bash
npm run build
```

---

### 5. Frontend Setup (Next.js)

#### 5.1 Navigate to Face-Scanning Directory

```bash
cd /home/raghul/projects/cdc/Ai-Proctor/face-scanning
```

#### 5.2 Install Dependencies

```bash
npm install
```

#### 5.3 Environment Configuration (Optional)

Create `.env.local` file:

```env
NEXT_PUBLIC_API_URL=https://localhost:3001
NEXT_PUBLIC_SOCKET_URL=https://localhost:3001
```

---

### 6. Storage Service Setup

#### 6.1 Navigate to Storage Directory

```bash
cd /home/raghul/projects/cdc/Ai-Proctor/storage
```

#### 6.2 Install Dependencies

```bash
npm install
```

#### 6.3 Create Required Directories

```bash
mkdir -p videos recordings
```

---

## 🚀 Running the Application

### Starting Services in Order

#### Terminal 1: Start XAMPP/MySQL

```bash
# Linux
sudo /opt/lampp/lampp start

# Windows - Use XAMPP Control Panel
# macOS - Use XAMPP application
```

#### Terminal 2: Start Backend Server

```bash
cd /home/raghul/projects/cdc/Ai-Proctor/backend
npm run dev

# Server will run on: https://localhost:3001
```

Wait for the message: `✅ Database connected and synced!`

#### Terminal 3: Start Storage Service

```bash
cd /home/raghul/projects/cdc/Ai-Proctor/storage
npm run dev

# Service will run on default port (check console)
```

#### Terminal 4: Start AI-Model Service

```bash
cd /home/raghul/projects/cdc/Ai-Proctor/AI-Model

# Activate virtual environment first
source venv/bin/activate  # Linux/macOS
# OR
venv\Scripts\activate  # Windows

# Run the service
python main.py

# Wait for: ✅ Connected to server
```

#### Terminal 5: Start Frontend (Next.js)

```bash
cd /home/raghul/projects/cdc/Ai-Proctor/face-scanning
npm run dev

# Frontend will run on: https://localhost:3000
```

### Accessing the Application

1. **Frontend**: https://localhost:3000
2. **Backend API**: https://localhost:3001
3. **phpMyAdmin**: http://localhost/phpmyadmin

**Note**: Your browser will warn about self-signed certificates. Click "Advanced" and proceed.

---

## 🔍 Troubleshooting

### Python Issues

#### Issue: `dlib` installation fails

**Solution**:

```bash
# Install build tools first
sudo apt install build-essential cmake libopenblas-dev liblapack-dev -y
pip install dlib
```

#### Issue: `ModuleNotFoundError: No module named 'cv2'`

**Solution**:

```bash
pip install opencv-python opencv-contrib-python
```

#### Issue: CUDA errors (if using GPU)

**Solution**:

```bash
# Disable CUDA by setting environment variable
export CUDA_VISIBLE_DEVICES="-1"
# This is already set in main.py
```

### Node.js/Backend Issues

#### Issue: Port 3001 already in use

**Solution**:

```bash
# Find and kill process
lsof -ti:3001 | xargs kill -9
# Or change port in backend/server.ts
```

#### Issue: MediaSoup build errors

**Solution**:

```bash
# Install build tools
sudo apt install build-essential python3 -y
npm rebuild mediasoup
```

#### Issue: Database connection failed

**Solution**:

```bash
# Verify MySQL is running
sudo /opt/lampp/lampp status

# Check database exists
mysql -u root -e "SHOW DATABASES;"

# Verify credentials in backend/db.ts match your MySQL setup
```

### Frontend Issues

#### Issue: `ECONNREFUSED` when connecting to backend

**Solution**:

- Ensure backend is running first
- Check SSL certificates are generated
- Verify backend URL in frontend configuration

#### Issue: Certificate errors in browser

**Solution**:

- Click "Advanced" in browser warning
- Select "Proceed to localhost (unsafe)"
- Or install the root CA certificate from backend

### XAMPP Issues

#### Issue: MySQL won't start

**Solution**:

```bash
# Check if another MySQL is running
sudo systemctl stop mysql
sudo killall mysqld

# Start XAMPP MySQL
sudo /opt/lampp/lampp startmysql
```

#### Issue: Port 80 or 443 already in use

**Solution**:

```bash
# Stop Apache2 if running
sudo systemctl stop apache2
sudo /opt/lampp/lampp start
```

### FFmpeg Issues

#### Issue: `ffmpeg: command not found`

**Solution**:

```bash
# Verify FFmpeg path
which ffmpeg

# Add to PATH if needed
export PATH=$PATH:/usr/local/bin
```

---

## 📁 Project Structure

```
Ai-Proctor/
├── AI-Model/                 # Python AI services
│   ├── core/                # Core CV modules
│   ├── functionality/       # Feature implementations
│   ├── handlers/            # Socket.IO handlers
│   ├── storage/             # Face data storage
│   ├── main.py             # Main entry point
│   ├── requirements.txt     # Python dependencies
│   └── *.onnx, *.pt        # Model files
│
├── backend/                 # Node.js API server
│   ├── controllers/         # Route controllers
│   ├── models/             # Database models
│   ├── routes/             # API routes
│   ├── sockets/            # WebSocket handlers
│   ├── middleware/         # Express middleware
│   ├── server.ts           # Main server file
│   ├── db.ts               # Database configuration
│   └── package.json        # Node dependencies
│
├── face-scanning/          # Next.js frontend
│   ├── src/
│   │   ├── app/           # Next.js app directory
│   │   └── components/    # React components
│   ├── public/            # Static assets
│   └── package.json       # Frontend dependencies
│
├── storage/                # Storage service
│   ├── src/               # Source files
│   ├── videos/            # Video storage
│   └── package.json       # Service dependencies
│
└── README.md              # This file
```

---

## 🔐 Security Notes

1. **Change Default Credentials**: Update JWT_SECRET in `.env`
2. **SSL Certificates**: Use proper certificates in production
3. **Database**: Set strong MySQL password for production
4. **Firewall**: Configure firewall rules for production deployment

---

## 📚 Additional Resources

- **MediaPipe Documentation**: https://google.github.io/mediapipe/
- **OpenCV Documentation**: https://docs.opencv.org/
- **YOLO Documentation**: https://docs.ultralytics.com/
- **Next.js Documentation**: https://nextjs.org/docs
- **MediaSoup Documentation**: https://mediasoup.org/documentation/

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

---

## 📄 License

This project is part of a computer vision proctoring system. Please check with the repository owner for licensing details.

---

## 👥 Support

For issues and questions:

- GitHub Issues: https://github.com/Saravanaff/Ai-Proctor/issues
- Check existing issues before creating new ones

---

## ✅ Quick Start Checklist

- [ ] FFmpeg installed and in PATH
- [ ] CMake installed
- [ ] Python 3.11 installed
- [ ] Node.js 20.x installed
- [ ] XAMPP/MySQL installed and running
- [ ] Database `test` created
- [ ] Python virtual environment created and activated
- [ ] Python requirements installed
- [ ] Backend dependencies installed (`npm install`)
- [ ] Frontend dependencies installed (`npm install`)
- [ ] Storage dependencies installed (`npm install`)
- [ ] Backend `.env` file configured
- [ ] SSL certificates generated
- [ ] All services started in correct order
- [ ] Can access frontend at https://localhost:3000

---

**Last Updated**: October 2025  
**Version**: 1.0.0
