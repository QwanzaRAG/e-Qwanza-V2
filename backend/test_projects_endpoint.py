#!/usr/bin/env python3
"""
Test spécifique pour l'endpoint des projets
"""
import requests
import json

BASE_URL = "http://localhost:8000"

def test_projects():
    """Test de l'endpoint des projets"""
    print("Test de l'endpoint des projets...")
    
    # Créer un admin
    admin_data = {
        "first_name": "Admin",
        "last_name": "Test", 
        "email": "admin@projects2.com",
        "password": "admin123",
        "role": "admin"
    }
    
    try:
        # Créer l'admin
        response = requests.post(f"{BASE_URL}/api/v1/auth/register", json=admin_data)
        if response.status_code == 201:
            admin_token = response.json()["access_token"]
            print("OK Admin cree")
            
            # Test endpoint projets
            headers = {"Authorization": f"Bearer {admin_token}"}
            response = requests.get(f"{BASE_URL}/api/v1/projects/", headers=headers)
            print(f"Status: {response.status_code}")
            print(f"Response: {response.text}")
            
            # Test avec paramètres
            response = requests.get(f"{BASE_URL}/api/v1/projects/?page=1&page_size=10", headers=headers)
            print(f"Status avec params: {response.status_code}")
            print(f"Response avec params: {response.text}")
            
        else:
            print(f"ERREUR creation admin: {response.text}")
            
    except Exception as e:
        print(f"ERREUR: {e}")

if __name__ == "__main__":
    test_projects()
