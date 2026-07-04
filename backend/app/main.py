import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.exceptions import AppException, app_exception_handler, global_exception_handler
from app.core.redis import close_redis, get_redis
from app.core.security import limiter
from app.services.storage_service import StorageService

# Setup standard logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup actions
    logger.info("Starting Face Authentication API...")
    
    # 1. Warm up Redis connection
    redis = get_redis()
    await redis.ping()
    logger.info("Connected to Redis successfully.")
    
    # 2. Ensure MinIO buckets exist
    StorageService.ensure_bucket()
    
    # 3. Load DeepFace models into memory (FaceService is singleton)
    from app.services.face_service import FaceService
    FaceService()  # This pre-loads ArcFace/RetinaFace models in the background
    
    yield
    
    # Shutdown actions
    logger.info("Shutting down API...")
    await close_redis()


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        debug=settings.DEBUG,
        lifespan=lifespan,
    )

    # Rate limiting
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    # Custom exceptions
    app.add_exception_handler(AppException, app_exception_handler)  # type: ignore
    if not settings.DEBUG:
        app.add_exception_handler(Exception, global_exception_handler)  # type: ignore

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Routers
    app.include_router(api_router, prefix="/api/v1")

    @app.get("/health", tags=["System"])
    async def health_check() -> dict:
        return {
            "status": "healthy",
            "version": settings.APP_VERSION,
            "face_model": settings.FACE_MODEL,
        }

    return app


app = create_app()
