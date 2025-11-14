#!/usr/bin/env python3
"""
Script de test pour vérifier les imports du système de maturité
"""

import sys
import os

# Ajouter le répertoire src au path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

def test_imports():
    """Teste tous les imports nécessaires"""
    try:
        print("Test des imports...")
        
        # Test pandas
        import pandas as pd
        print("OK: pandas importé avec succès")
        
        # Test openpyxl (optionnel)
        try:
            import openpyxl
            print("OK: openpyxl importé avec succès")
        except ImportError:
            print("INFO: openpyxl non disponible (optionnel)")
        
        # Test excel_parser
        from helpers.excel_parser import ExcelMaturityParser
        print("OK: ExcelMaturityParser importé avec succès")
        
        # Test MaturityController
        from controllers.MaturityController import MaturityController
        print("OK: MaturityController importé avec succès")
        
        # Test LLMProviderFactory
        from stores.llm.LLMProviderFactory import LLMProviderFactory
        print("OK: LLMProviderFactory importé avec succès")
        
        # Test config
        from helpers.config import get_settings
        print("OK: get_settings importé avec succès")
        
        print("\nTous les imports sont OK !")
        return True
        
    except ImportError as e:
        print(f"ERREUR d'import: {e}")
        return False
    except Exception as e:
        print(f"ERREUR inattendue: {e}")
        return False

if __name__ == "__main__":
    success = test_imports()
    sys.exit(0 if success else 1)