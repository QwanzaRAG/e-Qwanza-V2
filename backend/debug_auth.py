#!/usr/bin/env python3
"""
Script pour déboguer l'autorisation admin en détail
"""
import requests
import json
import base64

BASE_URL = "http://localhost:8000"

def decode_jwt_payload(token):
    """Décode le payload d'un token JWT"""
    try:
        parts = token.split('.')
        if len(parts) != 3:
            return None
        
        payload = parts[1]
        missing_padding = len(payload) % 4
        if missing_padding:
            payload += '=' * (4 - missing_padding)
        
        decoded = base64.b64decode(payload)
        return json.loads(decoded)
    except Exception as e:
        print(f"Erreur décodage: {e}")
        return None

def test_auth():
    """Test complet de l'autorisation"""
    print("Test complet de l'autorisation...")
    
    # 1. Créer un admin
    print("1. Creation d'un admin...")
    admin_data = {
        "first_name": "Admin",
        "last_name": "Test", 
        "email": "admin@test.com",
        "password": "admin123",
        "role": "admin"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/api/v1/auth/register", json=admin_data)
        print(f"Register status: {response.status_code}")
        print(f"Register response: {response.text}")
        
        if response.status_code == 201:
            admin_token = response.json()["access_token"]
            print("OK Admin cree")
            
            # 2. Décoder le token
            print("\n2. Décodage du token...")
            payload = decode_jwt_payload(admin_token)
            if payload:
                print(f"Token payload: {json.dumps(payload, indent=2)}")
                print(f"Rôle: '{payload.get('role')}'")
                print(f"Type rôle: {type(payload.get('role'))}")
            else:
                print("ERREUR: Impossible de decoder le token")
                return
            
            # 3. Test des endpoints
            print("\n3. Test des endpoints...")
            headers = {"Authorization": f"Bearer {admin_token}"}
            
            # Test projets
            print("Test /api/v1/projects/...")
            response = requests.get(f"{BASE_URL}/api/v1/projects/", headers=headers)
            print(f"Status: {response.status_code}")
            print(f"Response: {response.text}")
            
            # Test utilisateurs
            print("\nTest /api/v1/users/...")
            response = requests.get(f"{BASE_URL}/api/v1/users/", headers=headers)
            print(f"Status: {response.status_code}")
            print(f"Response: {response.text}")
            
        else:
            print(f"ERREUR creation admin: {response.text}")
            
    except Exception as e:
        print(f"ERREUR: {e}")

if __name__ == "__main__":
    test_auth()
