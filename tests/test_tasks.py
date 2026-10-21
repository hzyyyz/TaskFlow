from datetime import datetime

import pytest
from sqlalchemy import select

from app.models import Task


def user_headers(client, username):
    assert client.post("/api/v1/auth/register", json={
        "username": username, "email": f"{username}@example.com", "password": "secret123",
    }).status_code == 201
    response = client.post("/api/v1/auth/login", data={
        "username": username, "password": "secret123",
    })
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def test_task_crud_and_utc_dates(task_client):
    client, session_factory = task_client
    headers = user_headers(client, "alice")
    created = client.post("/api/v1/tasks", headers=headers, json={
        "title": "Write tests", "description": "first", "status": "doing",
        "priority": "high", "due_date": "2026-11-02T08:00:00+08:00",
    })
    assert created.status_code == 201
    task = created.json()
    task_id = task["id"]
    assert task["owner_id"] == 1
    assert task["due_date"] == "2026-11-02T00:00:00Z"
    assert set(task) == {
        "id", "title", "description", "status", "priority", "due_date",
        "owner_id", "created_at", "updated_at",
    }
    with session_factory() as session:
        stored = session.get(Task, task_id)
        assert stored.due_date == datetime(2026, 11, 2)
        old_updated_at = stored.updated_at

    detail = client.get(f"/api/v1/tasks/{task_id}", headers=headers)
    assert detail.status_code == 200
    assert detail.json()["title"] == "Write tests"
    changed = client.patch(f"/api/v1/tasks/{task_id}", headers=headers, json={
        "title": "Write more tests", "description": None, "status": "done", "due_date": None,
    })
    assert changed.status_code == 200
    assert changed.json()["description"] is None
    assert changed.json()["due_date"] is None
    assert changed.json()["priority"] == "high"
    assert changed.json()["updated_at"].endswith("Z")
    with session_factory() as session:
        assert session.get(Task, task_id).updated_at > old_updated_at
    due_changed = client.patch(f"/api/v1/tasks/{task_id}", headers=headers, json={
        "due_date": "2026-11-03T09:30:00+09:00",
    })
    assert due_changed.status_code == 200
    assert due_changed.json()["due_date"] == "2026-11-03T00:30:00Z"
    deleted = client.delete(f"/api/v1/tasks/{task_id}", headers=headers)
    assert deleted.status_code == 204
    assert deleted.content == b""
    assert client.get(f"/api/v1/tasks/{task_id}", headers=headers).status_code == 404


def test_list_filters_pagination_and_stable_order(task_client):
    client, session_factory = task_client
    alice = user_headers(client, "alice")
    bob = user_headers(client, "bob")
    ids = []
    for title, status, priority in [
        ("one", "todo", "low"), ("two", "doing", "high"),
        ("three", "todo", "high"),
    ]:
        response = client.post("/api/v1/tasks", headers=alice, json={
            "title": title, "status": status, "priority": priority,
        })
        assert response.status_code == 201
        ids.append(response.json()["id"])
    assert client.post("/api/v1/tasks", headers=bob, json={"title": "private"}).status_code == 201
    with session_factory() as session:
        for task in session.scalars(select(Task).where(Task.id.in_(ids))):
            task.created_at = datetime(2026, 1, 1)
        session.commit()

    page = client.get("/api/v1/tasks?page=1&page_size=2", headers=alice)
    assert page.status_code == 200
    assert page.json()["total"] == 3
    assert page.json()["page"] == 1
    assert page.json()["page_size"] == 2
    assert [item["id"] for item in page.json()["items"]] == ids[::-1][:2]
    second = client.get("/api/v1/tasks?page=2&page_size=2", headers=alice)
    assert [item["id"] for item in second.json()["items"]] == ids[::-1][2:]
    filtered = client.get("/api/v1/tasks?status=todo&priority=high", headers=alice)
    assert filtered.json()["total"] == 1
    assert [item["id"] for item in filtered.json()["items"]] == [ids[2]]
    assert client.get("/api/v1/tasks", headers=bob).json()["total"] == 1


@pytest.mark.parametrize("method", ["get", "patch", "delete"])
def test_other_users_task_is_404(task_client, method):
    client, _ = task_client
    alice = user_headers(client, "alice")
    bob = user_headers(client, "bob")
    task_id = client.post("/api/v1/tasks", headers=alice, json={"title": "secret"}).json()["id"]
    response = getattr(client, method)(
        f"/api/v1/tasks/{task_id}", headers=bob,
        **({"json": {"title": "stolen"}} if method == "patch" else {}),
    )
    assert response.status_code == 404
    assert client.get(f"/api/v1/tasks/{task_id}", headers=alice).status_code == 200


@pytest.mark.parametrize("method,path,body", [
    ("post", "/api/v1/tasks", {"title": "new"}),
    ("get", "/api/v1/tasks", None),
    ("get", "/api/v1/tasks/1", None),
    ("patch", "/api/v1/tasks/1", {"title": "changed"}),
    ("delete", "/api/v1/tasks/1", None),
])
def test_every_task_route_requires_authentication(task_client, method, path, body):
    client, _ = task_client
    response = getattr(client, method)(path, **({"json": body} if body else {}))
    assert response.status_code == 401


@pytest.mark.parametrize("method,path,body", [
    ("post", "/api/v1/tasks", {"title": ""}),
    ("post", "/api/v1/tasks", {"title": "x" * 101}),
    ("post", "/api/v1/tasks", {"title": "x", "status": "blocked"}),
    ("post", "/api/v1/tasks", {"title": "x", "priority": "urgent"}),
    ("post", "/api/v1/tasks", {"title": "x", "owner_id": 999}),
    ("post", "/api/v1/tasks", {"title": "x", "due_date": "2026-01-01T12:00:00"}),
    ("patch", "/api/v1/tasks/1", {"title": None}),
    ("patch", "/api/v1/tasks/1", {"status": None}),
    ("patch", "/api/v1/tasks/1", {"priority": None}),
    ("patch", "/api/v1/tasks/1", {"priority": "urgent"}),
    ("patch", "/api/v1/tasks/1", {"due_date": "2026-01-01T12:00:00"}),
    ("patch", "/api/v1/tasks/1", {"owner_id": 999}),
    ("get", "/api/v1/tasks?page=0", None),
    ("get", "/api/v1/tasks?page_size=0", None),
    ("get", "/api/v1/tasks?page_size=101", None),
    ("get", "/api/v1/tasks?status=blocked", None),
])
def test_invalid_task_input_returns_422(task_client, method, path, body):
    client, _ = task_client
    headers = user_headers(client, "alice")
    response = getattr(client, method)(
        path, headers=headers, **({"json": body} if body is not None else {}),
    )
    assert response.status_code == 422


def test_missing_task_is_404_for_detail_update_and_delete(task_client):
    client, _ = task_client
    headers = user_headers(client, "alice")
    assert client.get("/api/v1/tasks/999", headers=headers).status_code == 404
    assert client.patch("/api/v1/tasks/999", headers=headers, json={"title": "x"}).status_code == 404
    assert client.delete("/api/v1/tasks/999", headers=headers).status_code == 404
