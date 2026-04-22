from app.core.security import hash_password, verify_password, encrypt_api_key, decrypt_api_key


def test_password_round_trip():
    hashed = hash_password("secret123")
    assert verify_password("secret123", hashed)
    assert not verify_password("wrong", hashed)


def test_api_key_encryption_round_trip():
    original = "sk-test-key-abc123"
    encrypted = encrypt_api_key(original)
    assert encrypted != original
    assert decrypt_api_key(encrypted) == original
