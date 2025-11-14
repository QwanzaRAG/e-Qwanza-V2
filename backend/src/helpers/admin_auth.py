"""
Module pour la gestion de l'autorisation admin
"""
from fastapi import status
from fastapi.responses import JSONResponse
from typing import Optional, Tuple, Dict, Any

from .security import decode_token


def require_admin(authorization: Optional[str]) -> Tuple[Optional[Dict[str, Any]], Optional[JSONResponse]]:
    """
    Vérifie que l'utilisateur a le rôle admin
    
    Args:
        authorization: Header Authorization avec le token Bearer
        
    Returns:
        Tuple[token_data, error_response]
        - Si succès: (token_data, None)
        - Si erreur: (None, JSONResponse d'erreur)
    """
    if not authorization or not authorization.lower().startswith("bearer "):
        return None, JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            content={"signal": "unauthorized"}
        )
    
    try:
        token = authorization.split(" ", 1)[1]
        print(f"Token: {token}")
        data = decode_token(token)
        print(f"Data: {data}")
        role = data.get("role")
        email = data.get("email")
        print(f"Email: {email}")
        
        
        # Vérifier le rôle admin (peut être "ADMIN" ou "admin")
        print(f"Role dans le token: {role}")
        if role not in ["ADMIN", "admin"]:
            return None, JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN, 
                content={"signal": "forbidden"}
            )
        
        return data, None
        
    except Exception as e:
        print(f"Erreur lors de la vérification admin: {e}")
        return None, JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            content={"signal": "invalid_token"}
        )

