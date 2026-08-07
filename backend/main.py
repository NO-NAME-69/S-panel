"""
S Panel - Main Application
FastAPI server management panel entry point.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from config import PANEL_NAME, PANEL_VERSION, PANEL_HOST, PANEL_PORT, FRONTEND_DIR, LOG_FILE
from database import init_db
from auth.models import create_default_admin
from auth.routes import router as auth_router
from modules.system import router as system_router
from modules.websites import router as websites_router
from modules.databases import router as databases_router
from modules.files import router as files_router
from modules.terminal import router as terminal_router
from modules.ssl import router as ssl_router
from modules.services import router as services_router
from modules.firewall import router as firewall_router
from modules.cron import router as cron_router
from modules.docker import router as docker_router
from modules.software import router as software_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(str(LOG_FILE)),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: startup and shutdown events."""
    # Startup
    logger.info(f"Starting {PANEL_NAME} v{PANEL_VERSION}")
    await init_db()
    await create_default_admin()
    logger.info(f"Panel accessible at http://{PANEL_HOST}:{PANEL_PORT}")
    yield
    # Shutdown
    logger.info(f"{PANEL_NAME} shutting down")


# Create FastAPI application
app = FastAPI(
    title=PANEL_NAME,
    version=PANEL_VERSION,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(auth_router)
app.include_router(system_router)
app.include_router(websites_router)
app.include_router(databases_router)
app.include_router(files_router)
app.include_router(terminal_router)
app.include_router(ssl_router)
app.include_router(services_router)
app.include_router(firewall_router)
app.include_router(cron_router)
app.include_router(docker_router)
app.include_router(software_router)


# Serve frontend static files
app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIR / "assets")), name="assets")
app.mount("/css", StaticFiles(directory=str(FRONTEND_DIR / "css")), name="css")
app.mount("/js", StaticFiles(directory=str(FRONTEND_DIR / "js")), name="js")


@app.get("/")
async def serve_index():
    """Serve the main SPA index.html."""
    return FileResponse(str(FRONTEND_DIR / "index.html"))


@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    """Catch-all route for SPA routing — serve index.html for all non-API paths."""
    # Don't catch API routes
    if full_path.startswith("api/"):
        return {"detail": "Not Found"}

    # Check if it's a static file
    file_path = FRONTEND_DIR / full_path
    if file_path.is_file():
        return FileResponse(str(file_path))

    # Otherwise serve index.html for SPA routing
    return FileResponse(str(FRONTEND_DIR / "index.html"))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=PANEL_HOST,
        port=PANEL_PORT,
        reload=False,
        log_level="info"
    )
