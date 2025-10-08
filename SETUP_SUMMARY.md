# Windows Environment Setup Summary

## Environment Specifications

### Required Versions

- **Python**: 3.10.x (specifically 3.10.11)
- **Node.js**: 22.x LTS
- **Database**: MySQL (via XAMPP)

### Python Microservices (6 Services)

The AI-Model component runs as **6 separate microservices**:

1. `auth_service.py` - Face authentication and recognition service
2. `eye_service.py` - Eye movement tracking service
3. `webdetect_service.py` - Web browsing detection service
4. `head_service.py` - Head pose estimation service
5. `mobile_service.py` - Mobile device detection service
6. `store_service.py` - Face data storage and frame processing service

Each service:

- Runs in its own process
- Connects to the backend server via Socket.IO
- Must be started with the virtual environment activated
- Requires all dependencies from `requirements.txt`

## Files Created/Updated

### New Files

1. **WINDOWS_SETUP.md**

   - Complete step-by-step Windows setup guide
   - Detailed installation instructions for all prerequisites
   - Troubleshooting section for common Windows issues
   - Verification checklist

2. **start-services-windows.bat**

   - Batch script to automatically start all 6 Python services
   - Opens each service in a separate Command Prompt window
   - Checks for virtual environment before starting
   - Provides user-friendly error messages

3. **start-services-windows.ps1**
   - PowerShell alternative to the batch script
   - Same functionality with PowerShell syntax
   - Color-coded output for better readability
   - For users who prefer PowerShell over Command Prompt

### Updated Files

1. **README.md**
   - Added Windows Quick Setup Guide section at the top
   - Updated Prerequisites to specify Python 3.10 and Node.js 22
   - Updated all Python installation instructions for 3.10
   - Updated all Node.js installation instructions for 22
   - Separated Python service startup into 5 distinct services
   - Added Windows-specific paths and commands throughout
   - Updated checklist to reflect Windows environment
   - Added reference to WINDOWS_SETUP.md
   - Updated version number to 1.1.0

## System Architecture

### Total Services Required: 10

1. **XAMPP/MySQL** (via XAMPP Control Panel)
2. **Backend Server** (Node.js/TypeScript) - Port 3001
3. **Storage Service** (Node.js) - Default port
4. **Auth Service** (Python) - Socket.IO client
5. **Eye Service** (Python) - Socket.IO client
6. **WebDetect Service** (Python) - Socket.IO client
7. **Head Service** (Python) - Socket.IO client
8. **Mobile Service** (Python) - Socket.IO client
9. **Store Service** (Python) - Socket.IO client
10. **Frontend** (Next.js) - Port 3000

### Startup Order

1. Start MySQL (XAMPP)
2. Start Backend Server
3. Start Storage Service
4. Start all 6 Python services (can be started in parallel)
5. Start Frontend

## Key Changes from Previous Version

### Version Changes

- **Python**: 3.11 → 3.10
- **Node.js**: 20.x → 22.x

### Documentation Changes

- Added dedicated Windows setup guide
- Clarified that there are exactly 5 Python services (not just "main.py")
- Added automated startup scripts for convenience
- Enhanced Windows-specific troubleshooting
- Added dlib pre-built wheel instructions for Python 3.10

### Service Architecture

- Documented microservice architecture clearly
- Each Python service runs independently
- Services communicate with backend via Socket.IO
- All services must run concurrently

## Usage Instructions

### For End Users

**Option 1: Automated Startup (Recommended)**

```cmd
cd C:\path\to\Ai-Proctor
start-services-windows.bat
```

**Option 2: Manual Startup**
Open 6 Command Prompts and run each service:

```cmd
cd C:\path\to\Ai-Proctor\AI-Model
venv\Scripts\activate
python auth_service.py
```

(Repeat for each of the 6 services)

### Prerequisites Before Running

1. Python 3.10.x installed
2. Node.js 22.x installed
3. XAMPP MySQL running
4. Database "test" created
5. Virtual environment created and packages installed
6. Backend and frontend npm packages installed
7. Backend .env file configured

## Verification Steps

After setup, verify:

```cmd
# 1. Check Python version
python --version
# Output: Python 3.10.11

# 2. Check Node version
node --version
# Output: v22.x.x

# 3. Check virtual environment packages
cd AI-Model
venv\Scripts\activate
python -c "import cv2; import mediapipe; import dlib; import face_recognition; print('OK')"
# Output: OK

# 4. Check MySQL is running
# XAMPP Control Panel should show MySQL as "Running" (green)

# 5. Access frontend
# Browser: https://localhost:3000
```

## Common Issues and Solutions

### Python Version Conflicts

**Issue**: Multiple Python versions installed
**Solution**: Use `py -3.10` command or set Python 3.10 as default in PATH

### dlib Installation on Windows

**Issue**: dlib fails to compile
**Solution**: Use pre-built wheel from https://github.com/jloh02/dlib/releases

- Download: `dlib-19.24.0-cp310-cp310-win_amd64.whl`
- Install: `pip install dlib-19.24.0-cp310-cp310-win_amd64.whl`

### Service Connection Issues

**Issue**: Python services can't connect to backend
**Solution**:

1. Ensure backend is running first
2. Check backend console for "Database connected"
3. Verify no firewall blocking localhost connections

### Port Conflicts

**Issue**: Port 3001 or 3000 already in use
**Solution**:

```cmd
netstat -ano | findstr :3001
taskkill /PID <process_id> /F
```

## Support and Documentation

- **Main README**: [README.md](./README.md) - Overview and quick start
- **Windows Guide**: [WINDOWS_SETUP.md](./WINDOWS_SETUP.md) - Detailed Windows instructions
- **Batch Script**: [start-services-windows.bat](./start-services-windows.bat) - Auto-start services (CMD)
- **PowerShell Script**: [start-services-windows.ps1](./start-services-windows.ps1) - Auto-start services (PS)

## Next Steps

For users setting up for the first time:

1. Read [WINDOWS_SETUP.md](./WINDOWS_SETUP.md) completely
2. Install all prerequisites in order
3. Create and configure virtual environment
4. Install all npm dependencies
5. Configure backend .env file
6. Use `start-services-windows.bat` to launch Python services
7. Start remaining services manually
8. Access application at https://localhost:3000

---

**Last Updated**: October 8, 2025
**Environment**: Windows 10/11
**Python**: 3.10.x
**Node.js**: 22.x
