import pytest
from fastapi.testclient import TestClient

from src.main import app


client = TestClient(app)


def test_create_user_requires_password(monkeypatch):
    # Fixture: patch db_client to a no-op to allow route import (we won't hit DB here)
    async def fake_db_client():
        class Dummy:
            async def __aenter__(self):
                return self
            async def __aexit__(self, exc_type, exc, tb):
                pass
        return Dummy()

    monkeypatch.setattr(app, "db_client", fake_db_client)

    res = client.post("/api/v1/users/", json={
        "first_name": "A",
        "last_name": "B",
        "email": "ab@example.com"
    })
    assert res.status_code == 400
    assert res.json().get("signal") == "password_required"


