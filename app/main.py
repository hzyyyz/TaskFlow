from fastapi import FastAPI

from app.api.auth import router as auth_router
from app.api.tasks import router as tasks_router

app = FastAPI(title="TaskFlow")
app.include_router(auth_router)
app.include_router(tasks_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
