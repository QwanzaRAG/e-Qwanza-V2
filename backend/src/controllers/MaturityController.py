import os
import tempfile
from typing import Dict, List, Any
from fastapi import UploadFile, HTTPException
from fastapi.responses import JSONResponse
from helpers.excel_parser import ExcelMaturityParser
from stores.llm.LLMProviderFactory import LLMProviderFactory
from stores.llm.LLMEnums import LLMEnums
from helpers.config import get_settings

class MaturityController:
    def __init__(self):
        try:
            self.settings = get_settings()
            self.llm_factory = LLMProviderFactory(self.settings)
        except Exception as e:
            print(f"ATTENTION: Configuration non disponible: {e}")
            self.settings = None
            self.llm_factory = None
    
    async def analyze_maturity_excel(self, file: UploadFile, eval_type: str | None = None) -> Dict[str, Any]:
        """Analyse le fichier Excel de maturité et génère des recommandations"""
        try:
            print(f"🔍 Début de l'analyse du fichier: {file.filename}")
            # Vérifier le type de fichier (Excel ou CSV)
            allowed_ext = ('.xlsx', '.xls', '.csv')
            if not file.filename.lower().endswith(allowed_ext):
                raise HTTPException(
                    status_code=400,
                    detail="Le fichier doit être au format .xlsx, .xls ou .csv"
                )
            
            # Sauvegarder temporairement le fichier
            suffix = '.csv' if file.filename.lower().endswith('.csv') else '.xlsx'
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp_file:
                content = await file.read()
                tmp_file.write(content)
                tmp_file_path = tmp_file.name
            
            try:
                # Parser le fichier Excel
                parser = ExcelMaturityParser(tmp_file_path)
                # Selon le besoin, on peut soit garder l'ancien modèle d'axes,
                # soit retourner un DataFrame normalisé depuis le CSV.
                axes = parser.parse()
                records = parser.parse_records()

                # Construire une table de correspondance axe -> score à partir de flat_records
                def _normalize_axis_label(label: str) -> str:
                    import re
                    base = label or ""
                    base = base.strip()
                    # Supprimer le préfixe "Axe X -" ou variantes
                    base = re.sub(r'(?i)^axe\s*\d+\s*[-–:]\s*', '', base).strip()
                    return base.lower()

                record_axis_score_map = {}
                for rec in records or []:
                    axe_label = rec.get("axe")
                    axe_score = rec.get("axe_score")
                    if axe_label and axe_score is not None:
                        key = _normalize_axis_label(axe_label)
                        # Premier score rencontré fait foi; on peut aussi écraser par le dernier, identique ici
                        record_axis_score_map[key] = axe_score
                
                if not axes:
                    raise HTTPException(
                        status_code=400,
                        detail="Aucun axe d'évaluation trouvé dans le fichier Excel"
                    )
                
                # Identifier les opportunités d'amélioration
                opportunities = parser.get_improvement_opportunities()
                print(f"🔍 Nombre d'opportunités trouvées (via questions): {len(opportunities)}")
                
                # Si aucune opportunité via les questions, créer depuis les flat_records
                if len(opportunities) == 0 and records:
                    print("🔄 Tentative de création d'opportunités depuis les flat_records...")
                    opportunities = self._create_opportunities_from_records(records, axes)
                    print(f"🔍 Nombre d'opportunités créées depuis records: {len(opportunities)}")
                
                # Générer des recommandations avec LLM
                if len(opportunities) == 0:
                    print("⚠️ Aucune opportunité trouvée, génération de recommandations par défaut impossible")
                recommendations = await self._generate_recommendations(opportunities)
                
                # Calculer le score global selon le type
                eval_type_norm = (eval_type or "devsecops").lower()
                if eval_type_norm == "architecture":
                    # Architecture: se baser sur les moyennes des axes détectés par le parseur
                    axis_scores = [axis.average_score for axis in axes if axis.average_score is not None]
                    global_score = round(sum(axis_scores) / len(axis_scores), 2) if axis_scores else 0.0
                else:
                    # DevSecOps (par défaut): prioriser les scores issus des flat_records, sinon fallback aux axes
                    scores = [s for s in record_axis_score_map.values() if s is not None]
                    if scores:
                        global_score = round(sum(scores) / len(scores), 2)
                    else:
                        global_score = self._calculate_global_score(axes)

                # Préparer la réponse
                response = {
                    "evaluation_type": eval_type_norm,
                    "global_score": global_score,
                    "total_axes": len(axes),
                    "axes_analysis": [
                        {
                            "name": axis.name,
                            "definition": axis.definition,
                            # Architecture: garder la moyenne de l'axe tel que parsée; DevSecOps: possibilité d'écraser via flat_records
                            "average_score": round(
                                (axis.average_score if eval_type_norm == "architecture" else (record_axis_score_map.get(_normalize_axis_label(axis.name), axis.average_score))) or 0.0,
                                2
                            ),
                            "max_score": 5.0,
                            "questions_count": len(axis.questions)
                        }
                        for axis in axes
                    ],
                    "flat_records": records,  # format tabulaire prêt pour le RAG
                    "improvement_opportunities": opportunities,
                    "recommendations": recommendations
                }
                
                return response
                
            finally:
                # Nettoyer le fichier temporaire
                if os.path.exists(tmp_file_path):
                    os.unlink(tmp_file_path)
                    
        except Exception as e:
            print(f"❌ Erreur dans analyze_maturity_excel: {str(e)}")
            print(f"❌ Type d'erreur: {type(e).__name__}")
            import traceback
            print(f"❌ Traceback: {traceback.format_exc()}")
            raise HTTPException(
                status_code=500,
                detail=f"Erreur lors de l'analyse du fichier: {str(e)}"
            )
    
    def _create_opportunities_from_records(self, records: List[Dict[str, Any]], axes: List) -> List[Dict[str, Any]]:
        """Crée les opportunités d'amélioration à partir des flat_records
        Simplifié : extrait directement les réponses avec VRAI et les classe par timeline selon le score
        """
        opportunities = []
        
        print(f"🔍 Nombre de records reçus: {len(records)}")
        
        # Créer un mapping axe -> définition depuis les axes parsés
        axis_definitions = {}
        for axis in axes:
            axis_definitions[axis.name.lower().strip()] = axis.definition
        
        # Parcourir les records et extraire uniquement ceux avec VRAI (réponse acceptée)
        for rec in records:
            answer_type = rec.get("answer_type", "").strip().upper()
            
            # Ne garder que les réponses avec VRAI
            if answer_type != "VRAI":
                continue
            
            axe = rec.get("axe", "").strip()
            question = rec.get("question", "").strip()
            answer_score = rec.get("answer_score")
            answer_text = rec.get("answer_text", "").strip()
            
            # Vérifier que toutes les données nécessaires sont présentes
            if not axe or not question or answer_score is None or not answer_text:
                continue
            
            # Ne garder que les scores < 5 (opportunités d'amélioration)
            if answer_score >= 5:
                continue
            
            # Trouver la définition de l'axe
            normalized_axe = axe.lower()
            axis_def = ""
            for key, def_value in axis_definitions.items():
                if key in normalized_axe or normalized_axe in key:
                    axis_def = def_value
                    break
            
            # Créer l'opportunité directement
            opportunities.append({
                "axis_name": axe,
                "axis_definition": axis_def or axe,
                "question": question,
                "current_response": answer_text,
                "current_score": answer_score,
                "next_level_response": "",  # Pas besoin de chercher la réponse suivante
                "next_level_score": answer_score + 1,  # Score suivant supposé
                "improvement_gap": 1
            })
        
        print(f"✅ {len(opportunities)} opportunités créées depuis flat_records (réponses avec VRAI et score < 5)")
        return opportunities
    
    async def _generate_recommendations(self, opportunities: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
        """Génère des recommandations avec LLM en une seule fois pour toutes les opportunités"""
        recommendations = {
            "short_term": [],  # Score 2 - 0-3 mois
            "medium_term": [],  # Score 3 - 3-12 mois
            "long_term": []  # Score 4 - 12+ mois
        }
        
        # Si aucune opportunité, retourner vide
        if not opportunities:
            print("⚠️ Aucune opportunité à traiter")
            return recommendations
        
        # Initialiser le LLM
        if self.llm_factory is None or self.settings is None:
            print("ATTENTION: LLM non disponible, utilisation de recommandations par défaut")
            return self._generate_default_recommendations(opportunities)
        
        llm_provider = self.llm_factory.create(LLMEnums.COHERE.value)
        if llm_provider is None:
            print("ATTENTION: Impossible de créer le provider Cohere, utilisation de recommandations par défaut")
            print(f"DEBUG: COHERE_API_KEY présent: {bool(self.settings.COHERE_API_KEY)}")
            print(f"DEBUG: GENERATION_MODEL_ID: {self.settings.GENERATION_MODEL_ID}")
            return self._generate_default_recommendations(opportunities)
        
        # Configurer le modèle de génération (OBLIGATOIRE pour CoHere)
        if not self.settings.GENERATION_MODEL_ID:
            print("ATTENTION: GENERATION_MODEL_ID non défini dans les settings, utilisation de recommandations par défaut")
            return self._generate_default_recommendations(opportunities)
        
        llm_provider.set_generation_model(self.settings.GENERATION_MODEL_ID)
        print(f"✅ Provider Cohere configuré avec le modèle: {self.settings.GENERATION_MODEL_ID}")
        print(f"📊 Génération de recommandations pour {len(opportunities)} opportunités en une seule fois")
        
        try:
            # Créer un prompt global avec toutes les opportunités
            prompt = self._create_global_recommendation_prompt(opportunities)
            
            # Générer les recommandations avec le LLM (méthode synchrone, on l'appelle via executor)
            import asyncio
            
            def call_llm():
                return llm_provider.generate_text(
                    prompt=prompt,
                    max_output_tokens=4000,  # Plus de tokens pour traiter toutes les opportunités
                    temperature=0.7
                )
            
            loop = asyncio.get_event_loop()
            llm_response = await loop.run_in_executor(None, call_llm)
            
            if llm_response is None:
                raise Exception("Réponse LLM vide")
            
            # Parser la réponse structurée du LLM
            parsed_recommendations = self._parse_structured_llm_response(llm_response, opportunities)
            
            # Organiser les recommandations par timeline
            recommendations = parsed_recommendations
            
        except Exception as e:
            print(f"❌ Erreur LLM lors de la génération globale: {str(e)}")
            import traceback
            print(traceback.format_exc())
            # Fallback vers recommandations par défaut
            print("🔄 Utilisation des recommandations par défaut")
            recommendations = self._generate_default_recommendations(opportunities)
        
        return recommendations
    
    def _generate_default_recommendations(self, opportunities: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
        """Génère des recommandations par défaut sans LLM selon le score"""
        recommendations = {
            "short_term": [],
            "medium_term": [],
            "long_term": []
        }
        
        for opportunity in opportunities:
            current_score = opportunity.get("current_score", 0)
            
            # Déterminer le timeline selon le score
            if current_score == 2:
                timeline = "short_term"
            elif current_score == 3:
                timeline = "medium_term"
            elif current_score == 4:
                timeline = "long_term"
            else:
                timeline = "medium_term"
            
            # Recommandation par défaut
            default_rec = {
                "axis_name": opportunity["axis_name"],
                "question": opportunity["question"],
                "current_situation": opportunity["current_response"],
                "target_situation": opportunity["next_level_response"],
                "recommendation": f"Améliorer {opportunity['axis_name']} en passant de '{opportunity['current_response'][:50]}...' à '{opportunity['next_level_response'][:50]}...'. Mettre en place un plan d'action progressif.",
                "timeline": timeline,
                "priority": "medium"
            }
            
            recommendations[timeline].append(default_rec)
        
        return recommendations
    
    def _create_global_recommendation_prompt(self, opportunities: List[Dict[str, Any]]) -> str:
        """Crée un prompt global avec toutes les opportunités pour le LLM"""
        
        # Organiser les opportunités par axe pour une meilleure structure
        opportunities_by_axis = {}
        for opp in opportunities:
            axis_name = opp.get("axis_name", "Autre")
            if axis_name not in opportunities_by_axis:
                opportunities_by_axis[axis_name] = {
                    "definition": opp.get("axis_definition", ""),
                    "opportunities": []
                }
            opportunities_by_axis[axis_name]["opportunities"].append(opp)
        
        # Construire le prompt avec toutes les opportunités
        prompt_parts = ["""
Dans le contexte d'un audit de maturité DevSecOps, analysez les situations suivantes et générez des recommandations structurées.

**MISSION :**
Pour chaque question ci-dessous, proposez des recommandations concrètes et actionnables pour améliorer la situation actuelle vers l'objectif cible.

**STRUCTURE DES RECOMMANDATIONS :**
Vous devez organiser les recommandations selon le score actuel :
- **Court terme (0-3 mois)** : Pour les questions avec score actuel = 2
- **Moyen terme (3-12 mois)** : Pour les questions avec score actuel = 3
- **Long terme (12+ mois)** : Pour les questions avec score actuel = 4

"""]
        
        # Ajouter chaque axe avec ses opportunités
        for axis_name, axis_data in opportunities_by_axis.items():
            prompt_parts.append(f"## Axe : {axis_name}")
            prompt_parts.append(f"**Définition :** {axis_data['definition']}\n")
            
            for idx, opp in enumerate(axis_data['opportunities'], 1):
                current_score = opp.get("current_score", 0)
                next_score = opp.get("next_level_score", 0)
                
                prompt_parts.append(f"""
### Question {idx} (Score actuel: {current_score}/5 → Objectif: {next_score}/5)
**Question :** {opp.get('question', '')}
**Situation actuelle :** {opp.get('current_response', '')}
**Objectif :** {opp.get('next_level_response', '')}
""")
        
        prompt_parts.append("""

**FORMAT DE RÉPONSE ATTENDU (JSON STRICT) :**

Vous devez répondre avec un JSON structuré comme suit :

{
    "short_term": [
        {
            "axis_name": "Nom de l'axe",
            "question": "Texte de la question",
            "current_situation": "Situation actuelle",
            "target_situation": "Situation cible",
            "recommendation": "Recommandation concrète et actionnable pour 0-3 mois",
            "priority": "high|medium|low"
        }
    ],
    "medium_term": [
        {
            "axis_name": "Nom de l'axe",
            "question": "Texte de la question",
            "current_situation": "Situation actuelle",
            "target_situation": "Situation cible",
            "recommendation": "Recommandation concrète et actionnable pour 3-12 mois",
            "priority": "high|medium|low"
        }
    ],
    "long_term": [
        {
            "axis_name": "Nom de l'axe",
            "question": "Texte de la question",
            "current_situation": "Situation actuelle",
            "target_situation": "Situation cible",
            "recommendation": "Recommandation concrète et actionnable pour 12+ mois",
            "priority": "high|medium|low"
        }
    ]
}

**RÈGLES IMPORTANTES :**
1. Une question avec score actuel = 2 doit être dans "short_term"
2. Une question avec score actuel = 3 doit être dans "medium_term"
3. Une question avec score actuel = 4 doit être dans "long_term"
4. Les recommandations doivent être concrètes, actionnables et adaptées au délai
5. Considérez les contraintes techniques, organisationnelles et les dépendances
6. Priorisez les actions selon leur impact et leur faisabilité

Générez maintenant les recommandations structurées au format JSON.
""")
        
        return "\n".join(prompt_parts)
    
    def _parse_structured_llm_response(self, response: str, opportunities: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
        """Parse la réponse structurée du LLM avec recommandations organisées par timeline"""
        recommendations = {
            "short_term": [],
            "medium_term": [],
            "long_term": []
        }
        
        try:
            import json
            import re
            
            # Nettoyer la réponse pour extraire le JSON (enlever markdown code blocks si présent)
            cleaned_response = response.strip()
            if "```json" in cleaned_response:
                cleaned_response = re.sub(r'```json\s*', '', cleaned_response)
                cleaned_response = re.sub(r'```\s*$', '', cleaned_response)
            elif "```" in cleaned_response:
                cleaned_response = re.sub(r'```\s*', '', cleaned_response)
            
            # Parser le JSON
            data = json.loads(cleaned_response)
            
            # Extraire les recommandations par timeline
            for timeline in ["short_term", "medium_term", "long_term"]:
                if timeline in data and isinstance(data[timeline], list):
                    recommendations[timeline] = data[timeline]
            
            print(f"✅ Recommandations parsées: {len(recommendations['short_term'])} court terme, {len(recommendations['medium_term'])} moyen terme, {len(recommendations['long_term'])} long terme")
            
        except json.JSONDecodeError as e:
            print(f"❌ Erreur de parsing JSON: {str(e)}")
            print(f"📄 Réponse reçue (premiers 500 caractères): {response[:500]}")
            # Fallback : créer des recommandations par défaut
            recommendations = self._generate_default_recommendations(opportunities)
        except Exception as e:
            print(f"❌ Erreur lors du parsing: {str(e)}")
            import traceback
            print(traceback.format_exc())
            # Fallback : créer des recommandations par défaut
            recommendations = self._generate_default_recommendations(opportunities)
        
        return recommendations
    
    def _calculate_global_score(self, axes: List) -> float:
        """Calcule le score global de maturité"""
        if not axes:
            return 0.0
        for axis in axes:
            print(f"🔍 Calcul du score global: {axis.average_score}")

        print(axes)
        total_score = sum(axis.average_score for axis in axes)
        print(f"🔍 Calcul du score global:{total_score} ")
        return round(total_score / len(axes), 2)
