import pytest

from helpers.security import hash_password, verify_password, create_token, decode_token


def test_hash_and_verify_password():
    plain = "S3cret!123"
    hashed = hash_password(plain)
    assert hashed != plain
    assert hashed.startswith("$")
    assert verify_password(plain, hashed) is True
    assert verify_password("wrong", hashed) is False


def test_create_and_decode_access_token_contains_type_and_sub():
    payload = {"sub": "42", "email": "user@example.com", "role": "admin"}
    token = create_token(payload)
    decoded = decode_token(token)
    assert decoded["sub"] == "42"
    assert decoded.get("type") == "access"
    # role is propagated when provided
    assert decoded.get("role") == "admin"


def test_create_and_decode_refresh_token_has_type_refresh():
    token = create_token({"sub": "99"}, refresh=True)
    decoded = decode_token(token)
    assert decoded["sub"] == "99"
    assert decoded.get("type") == "refresh"






