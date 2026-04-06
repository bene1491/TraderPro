import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from routes.search    import router as search_router
from routes.quotes    import router as quotes_router
from routes.ws        import router as ws_router
from routes.news      import router as news_router
from routes.portfolio import router as portfolio_router

load_dotenv()

app = FastAPI(title="TraderPro API", version="1.0.0")

# CORS — allow frontend origins
origins_raw = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:4173",
)
origins = [o.strip() for o in origins_raw.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET"],
    allow_headers=["*"],
)

app.include_router(search_router,    prefix="/api", tags=["search"])
app.include_router(quotes_router,    prefix="/api", tags=["quotes"])
app.include_router(ws_router,        prefix="/api", tags=["ws"])
app.include_router(news_router,      prefix="/api", tags=["news"])
app.include_router(portfolio_router, prefix="/api", tags=["portfolio"])


@app.get("/health")
async def health():
    return {"status": "ok"}
