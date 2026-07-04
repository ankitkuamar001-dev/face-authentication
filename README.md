# 🔐 FaceAuth — Production-Grade Biometric Authentication

<p align="center">
  <img src="https://img.shields.io/badge/FastAPI-0.111-009688?style=for-the-badge&logo=fastapi" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react" />
  <img src="https://img.shields.io/badge/DeepFace-ArcFace-blueviolet?style=for-the-badge" />
  <img src="https://img.shields.io/badge/PostgreSQL-pgvector-336791?style=for-the-badge&logo=postgresql" />
  <img src="https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker" />
</p>

A **production-grade** facial recognition authentication system featuring:
- 🎥 **Real-time face scanning** with liveness detection (blink / head-turn challenges)
- 🧠 **ArcFace embeddings** via DeepFace + RetinaFace detector
- 🔐 **JWT auth** with refresh token rotation
- 📧 **OTP email fallback** when face auth fails
- 🗄️ **pgvector** HNSW index for fast nearest-neighbour face search
- 🛡️ **Redis** rate limiting & account lockout
- 🪣 **MinIO** object storage for face thumbnails
- 👑 **Admin panel** with user management and audit logs

---

## 🏗️ Architecture

```
┌────────────┐    ┌──────────────┐    ┌──────────────┐
│  Frontend  │───▶│  FastAPI API │───▶│  PostgreSQL  │
│  React+Vite│    │  (port 8000) │    │  + pgvector  │
│ (port 3000)│    └──────┬───────┘    └──────────────┘
└────────────┘           │
                    ┌────┴────┐    ┌────────┐
                    │  Redis  │    │  MinIO │
                    └─────────┘    └────────┘
```

---

## 🚀 Quick Start

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Git](https://git-scm.com/)

### 1. Clone the repo
```bash
git clone https://github.com/ankitkuamar001-dev/face-authentication.git
cd face-authentication
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env — at minimum change JWT_SECRET_KEY
```

### 3. Start all services
```bash
docker compose up --build -d
```

### 4. Open the app
| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| API Docs | http://localhost:8000/docs |
| MinIO Console | http://localhost:9001 |

---

## 🔧 Configuration

Copy `.env.example` to `.env` and configure:

| Variable | Description |
|----------|-------------|
| `JWT_SECRET_KEY` | **Change this!** Long random secret |
| `ALLOWED_ORIGINS` | Comma-separated allowed CORS origins |
| `SIMILARITY_THRESHOLD` | Face match threshold (0.0–1.0, default `0.32`) |
| `SMTP_CONSOLE_OUTPUT` | `true` = print OTP to console (dev mode) |
| `SMTP_SERVER` / `SMTP_USERNAME` | Email config for OTP delivery |

---

## 📁 Project Structure

```
face-authentication/
├── backend/
│   ├── app/
│   │   ├── api/v1/        # Auth, User, Admin routes
│   │   ├── core/          # Config, security, Redis
│   │   ├── db/            # SQLAlchemy async session
│   │   ├── models/        # DB models (User, FaceEmbedding, AuthLog…)
│   │   ├── schemas/       # Pydantic schemas
│   │   └── services/      # FaceService, EmailService, StorageService
│   ├── alembic/           # DB migrations
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── api/           # Axios client with interceptors
│   │   ├── components/    # WebcamCapture, LivenessChallenge, FaceOverlay…
│   │   ├── hooks/         # useWebcam, useLiveness, useAuth
│   │   ├── pages/         # Login, Register, Dashboard, Admin, OTP
│   │   ├── store/         # Zustand auth store
│   │   └── utils/         # faceDetection.ts, constants.ts
│   └── Dockerfile
├── docker-compose.yml
└── .env.example
```

---

## 🧪 API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/auth/register` | Register with face scan |
| `POST` | `/api/v1/auth/login` | Login with face recognition |
| `POST` | `/api/v1/auth/refresh` | Refresh JWT tokens |
| `POST` | `/api/v1/auth/otp/request` | Request OTP email |
| `POST` | `/api/v1/auth/otp/verify` | Verify OTP |
| `GET` | `/api/v1/user/me` | Current user profile |
| `GET` | `/api/v1/admin/users` | List all users (admin) |
| `GET` | `/api/v1/admin/logs` | Auth logs (admin) |

Full interactive docs at **http://localhost:8000/docs**

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, TailwindCSS v4, Zustand, face-api.js |
| Backend | FastAPI, SQLAlchemy (async), Alembic, Pydantic v2 |
| ML | DeepFace (ArcFace + RetinaFace) |
| Database | PostgreSQL 16 + pgvector |
| Cache | Redis 7 |
| Storage | MinIO |
| Auth | JWT (RS256), Refresh Token Rotation |
| DevOps | Docker Compose |

---

## 📄 License

MIT © 2024
