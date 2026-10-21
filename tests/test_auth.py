from datetime import datetime, timedelta, timezone

import jwt
import pytest
from sqlalchemy import select

from app.models import User
from app.schemas.user import UserCreate
from app.services.auth_service import DuplicateUserError, register_user


def register(client, username="alice", email="alice@example.com", password="secret123"):
    return client.post("/api/v1/auth/register", json={
        "username": username, "email": email, "password": password,
    })


def test_register_returns_public_user_and_argon2_hash(auth_client):
    client, session_factory = auth_client
    response = register(client)
    assert response.status_code == 201
    assert set(response.json()) == {"id", "username", "email", "created_at"}
    assert response.json()["created_at"].endswith("Z")
    with session_factory() as session:
        user = session.scalar(select(User).where(User.username == "alice"))
        assert user.hashed_password != "secret123"
        assert user.hashed_password.startswith("$argon2id$")


@pytest.mark.parametrize("username,email", [
    ("alice", "other@example.com"), ("other", "alice@example.com"),
])
def test_duplicate_username_or_email_returns_409(auth_client, username, email):
    client, _ = auth_client
    assert register(client).status_code == 201
    response = register(client, username=username, email=email)
    assert response.status_code == 409
    assert "password" not in response.text.lower()


def test_login_and_me_with_username(auth_client):
    client, _ = auth_client
    assert register(client).status_code == 201
    response = client.post("/api/v1/auth/login", data={
        "username": "alice", "password": "secret123",
    })
    assert response.status_code == 200
    assert response.json()["token_type"] == "bearer"
    token = response.json()["access_token"]
    claims = jwt.decode(token, "test-only-secret", algorithms=["HS256"])
    assert claims["sub"] == "1"
    assert "exp" in claims
    me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["username"] == "alice"
    assert "hashed_password" not in me.json()


@pytest.mark.parametrize("username,password", [
    ("alice", "incorrect"), ("missing", "secret123"),
])
def test_wrong_credentials_return_401(auth_client, username, password):
    client, _ = auth_client
    assert register(client).status_code == 201
    response = client.post("/api/v1/auth/login", data={
        "username": username, "password": password,
    })
    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"


@pytest.mark.parametrize("token", [None, "forged", "expired", "unknown-user"])
def test_me_rejects_missing_invalid_expired_and_unknown_user_tokens(auth_client, token):
    client, _ = auth_client
    if token == "expired":
        token = jwt.encode({
            "sub": "1", "exp": datetime.now(timezone.utc) - timedelta(seconds=1),
        }, "test-only-secret", algorithm="HS256")
    elif token == "unknown-user":
        token = jwt.encode({
            "sub": "999", "exp": datetime.now(timezone.utc) + timedelta(minutes=5),
        }, "test-only-secret", algorithm="HS256")
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    response = client.get("/api/v1/auth/me", headers=headers)
    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"


def test_registration_rejects_short_password(auth_client):
    client, _ = auth_client
    assert register(client, password="short").status_code == 422


def test_registration_rolls_back_when_unique_constraint_wins_race(auth_client, monkeypatch):
    client, session_factory = auth_client
    assert register(client).status_code == 201
    with session_factory() as session:
        with monkeypatch.context() as patch:
            patch.setattr(session, "scalar", lambda _: None)
            with pytest.raises(DuplicateUserError):
                register_user(session, UserCreate(
                    username="alice", email="new@example.com", password="secret123",
                ))
        assert not session.in_transaction()
        user = register_user(session, UserCreate(
            username="bob", email="bob@example.com", password="secret123",
        ))
        assert user.id > 0


@pytest.mark.parametrize("payload,algorithm", [
    ({"sub": "1"}, "HS256"),
    ({"sub": "1", "exp": datetime.now(timezone.utc) + timedelta(minutes=5)}, "HS384"),
])
def test_me_rejects_missing_exp_or_unapproved_algorithm(auth_client, payload, algorithm):
    client, _ = auth_client
    assert register(client).status_code == 201
    token = jwt.encode(payload, "test-only-secret", algorithm=algorithm)
    response = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"
