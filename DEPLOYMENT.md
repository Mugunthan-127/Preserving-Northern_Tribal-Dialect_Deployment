# 🚀 Cloud Deployment Guide

This guide explains how to deploy **BhashaRakshak AI** to the cloud for free (using Render.com or Railway.app).

## 1. Prerequisites
- A GitHub account (where this code is pushed).
- Accounts on [Render.com](https://render.com) or [Railway.app](https://railway.app).

---

## 2. Deploy Backend (Java Spring Boot)

1.  **New Web Service**: Connect your GitHub repo.
2.  **Root Directory**: `backend/springapp`
3.  **Environment**: Docker
4.  **Environment Variables**:
    - `APP_ALLOWED_ORIGINS`: `https://your-frontend-url.vercel.app` (You will get this URL in Step 3)
    - `MONGO_URI`: (Optional if you want to override the `application.properties` one)
5.  **Build & Deploy**.

*Render will detect the Dockerfile and build your Java app automatically.*

---

## 3. Deploy AI Service (Python)

1.  **New Web Service**: Connect your GitHub repo.
2.  **Root Directory**: `ai-services`
3.  **Environment**: Docker
4.  **Environment Variables**: None specific needed for now.
5.  **Build & Deploy**.

*Note: The Python service listens on Port 8000.*

---

## 4. Deploy Frontend (React + Vite)

**Recommended: use Vercel.com**

1.  **Import Project**: Select your GitHub repo.
2.  **Framework Preset**: Vite
3.  **Root Directory**: `frontend/reactapp`
4.  **Environment Variables**:
    - `VITE_API_URL`: `https://your-java-backend-url.onrender.com` (The URL from Step 2)
5.  **Build Command**: `npm run build`
6.  **Output Directory**: `dist`
7.  **Deploy**.

---

## 5. Final Configuration

Once all three are running:
1.  Go back to your **Backend (Java)** dashboard.
2.  Update `APP_ALLOWED_ORIGINS` to include your new **Frontend URL** (e.g., `https://bhasharakshak.vercel.app`).
3.  Redeploy the Backend.

**🎉 Your App is Live!**
