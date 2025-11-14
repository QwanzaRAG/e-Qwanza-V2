#!/usr/bin/env python3
"""
Script pour déboguer le contenu du token JWT
"""
import requests
import json
import base64

from backend.test_admin_fix import USER_PASSWORD

# Configuration
BASE_URL = "http://localhost:8000"
ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "admin123"
USER_EMAIL = "user@example.com"
USER_PASSWORD = "user123"
def decode_jwt_payload(token):
    """Décode le payload d'un token JWT"""
    try:
        # Séparer les parties du token
        parts = token.split('.')
        if len(parts) != 3:
            return None
        
        # Décoder le payload (partie 2)
        payload = parts[1]
        # Ajouter le padding si nécessaire
        missing_padding = len(payload) % 4
        if missing_padding:
            payload += '=' * (4 - missing_padding)
        
        decoded = base64.b64decode(payload)
        return json.loads(decoded)
    except Exception as e:
        print(f"Erreur lors du décodage: {e}")
        return None

def debug_jwt_tokens():
    """Débogue les tokens JWT"""
    print("🔍 Débogage des tokens JWT...")
    
    # 1. Créer un utilisateur admin
    print("1. Création d'un utilisateur admin...")
    admin_data = {
        "first_name": "Admin",
        "last_name": "Test",
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD,
        "role": "admin"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/api/v1/auth/register", json=admin_data)
        if response.status_code == 201:
            admin_token = response.json()["access_token"]
            print("✅ Utilisateur admin créé")
        else:
            print(f"❌ Erreur création admin: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"❌ Erreur lors de la création admin: {e}")
        return False
    
    # 2. Décoder le token admin
    print("\n2. Décodage du token admin...")
    admin_payload = decode_jwt_payload(admin_token)
    if admin_payload:
        print(f"Token admin payload: {json.dumps(admin_payload, indent=2)}")
        print(f"Rôle dans le token: '{admin_payload.get('role')}'")
    else:
        print("❌ Impossible de décoder le token admin")
        return False
    
    # 3. Créer un utilisateur normal
    print("\n3. Création d'un utilisateur normal...")
    user_data = {
        "first_name": "User",
        "last_name": "Test",
        "email": USER_EMAIL,
        "password": USER_PASSWORD,
        "role": "user"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/api/v1/auth/register", json=user_data)
        if response.status_code == 201:
            user_token = response.json()["access_token"]
            print("✅ Utilisateur normal créé")
        else:
            print(f"❌ Erreur création user: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"❌ Erreur lors de la création user: {e}")
        return False
    
    # 4. Décoder le token user
    print("\n4. Décodage du token user...")
    user_payload = decode_jwt_payload(user_token)
    if user_payload:
        print(f"Token user payload: {json.dumps(user_payload, indent=2)}")
        print(f"Rôle dans le token: '{user_payload.get('role')}'")
    else:
        print("❌ Impossible de décoder le token user")
        return False
    
    print("\n🎉 Débogage des tokens JWT terminé !")
    return True

if __name__ == "__main__":
    print("🚀 Démarrage du débogage des tokens JWT...")
    success = debug_jwt_tokens()
    exit(0 if success else 1)

