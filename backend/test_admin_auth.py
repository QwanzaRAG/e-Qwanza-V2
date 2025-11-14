#!/usr/bin/env python3
"""
Script de test pour vérifier l'autorisation admin
"""
import requests
import json
import sys

# Configuration
BASE_URL = "http://localhost:8000"
ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "admin123"
USER_EMAIL = "user@example.com"
USER_PASSWORD = "user123"

def test_admin_auth():
    """Test de l'autorisation admin"""
    print("🔍 Test de l'autorisation admin...")
    
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
    
    # 2. Créer un utilisateur normal
    print("2. Création d'un utilisateur normal...")
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
    
    # 3. Test accès projets avec token admin
    print("3. Test accès projets avec token admin...")
    headers_admin = {"Authorization": f"Bearer {admin_token}"}
    
    try:
        response = requests.get(f"{BASE_URL}/api/v1/projects/", headers=headers_admin)
        if response.status_code == 200:
            print("✅ Accès projets avec admin: SUCCESS")
        else:
            print(f"❌ Accès projets avec admin: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"❌ Erreur accès projets admin: {e}")
        return False
    
    # 4. Test accès projets avec token user (doit échouer)
    print("4. Test accès projets avec token user (doit échouer)...")
    headers_user = {"Authorization": f"Bearer {user_token}"}
    
    try:
        response = requests.get(f"{BASE_URL}/api/v1/projects/", headers=headers_user)
        if response.status_code == 403:
            print("✅ Accès projets avec user: CORRECTLY BLOCKED (403)")
        else:
            print(f"❌ Accès projets avec user: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"❌ Erreur accès projets user: {e}")
        return False
    
    # 5. Test accès utilisateurs avec token admin
    print("5. Test accès utilisateurs avec token admin...")
    
    try:
        response = requests.get(f"{BASE_URL}/api/v1/users/", headers=headers_admin)
        if response.status_code == 200:
            print("✅ Accès utilisateurs avec admin: SUCCESS")
        else:
            print(f"❌ Accès utilisateurs avec admin: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"❌ Erreur accès utilisateurs admin: {e}")
        return False
    
    # 6. Test accès utilisateurs avec token user (doit échouer)
    print("6. Test accès utilisateurs avec token user (doit échouer)...")
    
    try:
        response = requests.get(f"{BASE_URL}/api/v1/users/", headers=headers_user)
        if response.status_code == 403:
            print("✅ Accès utilisateurs avec user: CORRECTLY BLOCKED (403)")
        else:
            print(f"❌ Accès utilisateurs avec user: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"❌ Erreur accès utilisateurs user: {e}")
        return False
    
    print("\n🎉 Tous les tests d'autorisation admin sont passés !")
    return True

if __name__ == "__main__":
    print("🚀 Démarrage des tests d'autorisation admin...")
    success = test_admin_auth()
    sys.exit(0 if success else 1)

