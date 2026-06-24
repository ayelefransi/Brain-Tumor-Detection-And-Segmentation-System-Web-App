---
title: Brain Tumor API
emoji: 🧠
colorFrom: blue
colorTo: purple
sdk: docker
pinned: false
---
# Brain Tumor Detection & Segmentation System

A full-stack medical AI application for 3D Brain Tumor segmentation and classification. The system features a modern Next.js frontend with 3D visualization capabilities and a robust FastAPI backend running PyTorch/MONAI inference.

## 🚀 Architecture

- **Frontend:** Next.js 14, React 18, Tailwind CSS, React Three Fiber (3D visualization), Prisma (SQLite).
- **Backend:** FastAPI, PyTorch, MONAI, NiBabel.
- **Model:** 3D Attention U-Net with a Classification Head (`BraTSNet`), trained on the BraTS 2021 dataset.

## 📁 Project Structure

```text
.
├── backend/                  # Python FastAPI inference service
│   ├── main.py               # FastAPI application and endpoints
│   ├── inference.py          # PyTorch inference engine
│   ├── model.py              # Custom BraTSNet architecture
│   └── requirements.txt      # Python dependencies
├── frontend/                 # Next.js Web Application
│   ├── src/app/              # Next.js App Router (UI & API)
│   ├── prisma/               # Database schema and SQLite db
│   ├── package.json          # Node.js dependencies
│   └── next.config.mjs       # Next.js configuration
├── best_model.pt             # Trained PyTorch model weights (State Dict)
└── brain_tumor_app.html      # Original UI prototype
```

## 🛠️ Installation

### 1. Backend Setup (FastAPI)

Requires Python 3.9+.

```powershell
cd backend
python -m venv venv

# Activate virtual environment
.\venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Frontend Setup (Next.js)

Requires Node.js (v20+ recommended).

```powershell
cd frontend
npm install --legacy-peer-deps

# Initialize Prisma Database (SQLite)
npx prisma generate
npx prisma db push
```

## 🏃‍♂️ Running the Application

To use the system, you must run both the backend and frontend concurrently in two separate terminal windows.

### 1. Start the Backend Server

```powershell
cd backend
.\venv\Scripts\activate
uvicorn main:app --reload --port 8000
```
*The API will be available at `http://127.0.0.1:8000`*

### 2. Start the Frontend Server

```powershell
cd frontend
npm run dev
```
*The web interface will be available at `http://localhost:3000`*

## 💡 Usage

1. Open `http://localhost:3000` in your browser.
2. Drag and drop a medical scan file (`.nii`, `.nii.gz`) into the upload zone on the "Viewer" tab.
3. The file is uploaded to the Next.js API, forwarded to the FastAPI server, and processed by the 3D PyTorch model.
4. View the extracted volume metrics, classification probabilities (LGG vs HGG), and the 3D representation in the dashboard.
