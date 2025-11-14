#!/usr/bin/env python3
"""
Test simple pour vérifier l'autorisation admin
"""
import requests
import json

BASE_URL = "http://localhost:8000"

def test_simple():
    """Test simple de l'autorisation"""
    print("🔍 Test simple de l'autorisation...")
    
    # Créer un admin
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
        if response.status_code == 201:
            admin_token = response.json()["access_token"]
            print("✅ Admin créé")
            
            # Test accès projets
            headers = {"Authorization": f"Bearer {admin_token}"}
            response = requests.get(f"{BASE_URL}/api/v1/projects/", headers=headers)
            print(f"Projects status: {response.status_code}")
            print(f"Projects response: {response.text}")
            
            # Test accès utilisateurs
            response = requests.get(f"{BASE_URL}/api/v1/users/", headers=headers)
            print(f"Users status: {response.status_code}")
            print(f"Users response: {response.text}")
            
        else:
            print(f"❌ Erreur création admin: {response.text}")
            
    except Exception as e:
        print(f"❌ Erreur: {e}")

if __name__ == "__main__":
    test_simple()



