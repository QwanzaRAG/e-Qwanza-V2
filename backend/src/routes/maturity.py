from fastapi import APIRouter, UploadFile, File, Depends, Request
from fastapi.responses import JSONResponse
from controllers import MaturityController
from helpers.admin_auth import require_admin

maturity_router = APIRouter(prefix="/api/v1/maturity", tags=["maturity"])

@maturity_router.post("/analyze")
async def analyze_maturity_excel(
    request: Request,
    file: UploadFile = File(...),
    authorization: str | None = None
):
    """
    Analyse un fichier Excel d'évaluation de maturité (DevSecOps ou Architecture)
    et génère des recommandations personnalisées
    """
    try:
        # Vérifier l'authentification (optionnel selon vos besoins)
        # token_data, error = require_admin(authorization)
        # if error is not None:
        #     return error
        
        eval_type = request.query_params.get("type")
        print(f"[Maturity] Reçu: filename={file.filename}, content_type={file.content_type}, type={eval_type}")
        # Initialiser le contrôleur
        controller = MaturityController()
        
        # Analyser le fichier
        result = await controller.analyze_maturity_excel(file, eval_type)
        print(f"[Maturity] Analyse OK: global_score={result.get('global_score')}, records={len(result.get('flat_records', []))}")
        
        return JSONResponse(
            status_code=200,
            content={
                "signal": "success",
                "data": result
            }
        )
        
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "signal": "error",
                "error": str(e)
            }
        )
