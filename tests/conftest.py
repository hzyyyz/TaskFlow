from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings
from app.db.base import Base
from app.db.session import get_db
from app.main import app as fastapi_app
import app.models  # noqa: F401 - registers all ORM tables


@pytest.fixture
def isolated_client(tmp_path, monkeypatch) -> Generator[tuple[TestClient, sessionmaker[Session]], None, None]:
    database_url = f"sqlite:///{tmp_path / 'taskflow.db'}"
    monkeypatch.setenv("DATABASE_URL", database_url)
    monkeypatch.setenv("JWT_SECRET_KEY", "test-only-secret")
    get_settings.cache_clear()
    engine = create_engine(database_url)

    @event.listens_for(engine, "connect")
    def enable_foreign_keys(connection, _connection_record) -> None:
        cursor = connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    Base.metadata.create_all(engine)
    session_factory = sessionmaker(bind=engine, expire_on_commit=False)

    def test_db() -> Generator[Session, None, None]:
        with session_factory() as session:
            yield session

    fastapi_app.dependency_overrides[get_db] = test_db
    try:
        with TestClient(fastapi_app) as client:
            yield client, session_factory
    finally:
        fastapi_app.dependency_overrides.pop(get_db, None)
        get_settings.cache_clear()
        engine.dispose()


@pytest.fixture
def auth_client(isolated_client):
    return isolated_client


@pytest.fixture
def task_client(isolated_client):
    return isolated_client
