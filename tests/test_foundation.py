from datetime import datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.exc import IntegrityError


def test_health_and_docs_are_available_without_database():
    from app.main import app

    client = TestClient(app)
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
    assert client.get("/docs").status_code == 200


def test_cors_allows_only_configured_frontend_origin():
    from app.main import app

    client = TestClient(app)
    headers = {
        "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "authorization",
    }
    allowed = client.options(
        "/api/v1/tasks",
        headers={**headers, "Origin": "http://localhost:5173"},
    )
    assert allowed.status_code == 200
    assert allowed.headers["access-control-allow-origin"] == "http://localhost:5173"

    denied = client.options(
        "/api/v1/tasks",
        headers={**headers, "Origin": "https://untrusted.example"},
    )
    assert denied.status_code == 400
    assert "access-control-allow-origin" not in denied.headers


def test_model_metadata_matches_foundation_contract():
    from app.db.base import Base
    import app.models  # noqa: F401

    assert set(Base.metadata.tables) == {"users", "tasks"}
    users = Base.metadata.tables["users"]
    tasks = Base.metadata.tables["tasks"]
    assert users.c.username.type.length == 50
    assert users.c.email.type.length == 255
    assert users.c.username.unique and users.c.email.unique
    assert tasks.c.title.type.length == 100
    assert tasks.c.description.nullable
    assert tasks.c.owner_id.nullable is False
    assert tasks.c.owner_id.index
    assert tasks.c.owner_id.foreign_keys
    assert {fk.target_fullname for fk in tasks.c.owner_id.foreign_keys} == {"users.id"}
    assert tasks.c.status.type.length == 16
    assert tasks.c.priority.type.length == 16


def test_task_schema_normalizes_due_date_and_marks_response_utc():
    from app.schemas.task import TaskCreate, TaskRead

    created = TaskCreate(title="Example", due_date="2026-01-02T08:00:00+08:00")
    assert created.due_date == datetime(2026, 1, 2, 0, 0)
    response = TaskRead(
        id=1, title="Example", description=None, status="todo", priority="medium",
        due_date=created.due_date, owner_id=1,
        created_at=datetime(2026, 1, 1), updated_at=datetime(2026, 1, 1),
    )
    assert response.model_dump(mode="json")["due_date"] == "2026-01-02T00:00:00Z"


@pytest.mark.parametrize("field,value", [("status", "blocked"), ("priority", "urgent")])
def test_task_schema_rejects_unknown_enum_values(field, value):
    from app.schemas.task import TaskCreate

    with pytest.raises(ValueError):
        TaskCreate(title="Example", **{field: value})


def test_isolated_database_enforces_owner_foreign_key(isolated_client):
    from app.models import Task

    _, session_factory = isolated_client
    with session_factory() as session:
        session.add(Task(title="orphan", owner_id=999))
        with pytest.raises(IntegrityError):
            session.commit()
        session.rollback()
