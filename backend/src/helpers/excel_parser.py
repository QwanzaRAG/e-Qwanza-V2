import re
from typing import Dict, List, Any, Optional
from dataclasses import dataclass

try:
    import pandas as pd
    PANDAS_AVAILABLE = True
except ImportError:
    PANDAS_AVAILABLE = False
    print("ATTENTION: pandas non disponible, utilisation d'une alternative")

try:
    import openpyxl
    OPENPYXL_AVAILABLE = True
except ImportError:
    OPENPYXL_AVAILABLE = False
    print("ATTENTION: openpyxl non disponible, utilisation d'une alternative")

@dataclass
class Question:
    question_text: str
    responses: List[Dict[str, Any]]  # [{"text": "...", "score": int, "selected": bool}]
    current_score: int

@dataclass
class Axis:
    name: str
    definition: str
    questions: List[Question]
    average_score: float

class ExcelMaturityParser:
    def __init__(self, file_path: str):
        self.file_path = file_path
        self.axes: List[Axis] = []
    
    def parse(self) -> List[Axis]:
        """Parse le fichier Excel/CSV et extrait les axes d'évaluation"""
        try:
            if not PANDAS_AVAILABLE:
                # Version simplifiée sans pandas
                return self._parse_simple()

            # Détecter CSV vs Excel
            lower_path = self.file_path.lower()
            if lower_path.endswith('.csv'):
                # Lecture CSV avec détection automatique de l'encodage et du séparateur
                df = self._read_csv_with_encoding_detection()
            else:
                # Lecture Excel (xlsx/xls)
                df = pd.read_excel(self.file_path, header=None)
            
            # Debug: Afficher les premières lignes du fichier
            print(f"📊 Dimensions du fichier: {df.shape}")
            print(f"📊 Premières lignes du fichier:")
            for i in range(min(20, len(df))):  # Plus de lignes pour voir les axes
                row_data = []
                for j in range(min(5, len(df.columns))):
                    cell_value = str(df.iloc[i, j]) if len(df.columns) > j else ""
                    if cell_value.lower() in ['nan', 'none']:
                        cell_value = ""
                    row_data.append(f"Col{j}: '{cell_value}'")
                print(f"Ligne {i}: {' | '.join(row_data)}")
                
                # Chercher spécifiquement les axes dans cette ligne
                for j in range(min(5, len(df.columns))):
                    cell_value = str(df.iloc[i, j]) if len(df.columns) > j else ""
                    if "axe" in cell_value.lower() or "hypothèse" in cell_value.lower():
                        print(f"🎯 POTENTIEL AXE trouvé ligne {i}, col {j}: '{cell_value}'")
            
            # Trouver les axes (format DevSecOps par défaut)
            self._extract_axes(df)

            # Si aucun axe trouvé, tenter le format "Architecture Capabilities"
            if not self.axes:
                print("⚙️ Aucun axe détecté avec le pattern standard. Tentative format 'Architecture Capabilities'.")
                self._extract_axes_architecture(df)
            
            return self.axes
        except Exception as e:
            raise Exception(f"Erreur lors du parsing Excel: {str(e)}")
    
    def _parse_simple(self) -> List[Axis]:
        """Version simplifiée du parser sans pandas"""
        # Pour l'instant, retourner des données de test
        # TODO: Implémenter un parser CSV ou XML simple
        print("Utilisation du parser simplifié (données de test)")
        
        # Données de test pour démonstration
        test_axis = Axis(
            name="Test - Hypothèse",
            definition="Test de l'axe hypothèse pour démonstration",
            questions=[
                Question(
                    question_text="Comment votre processus de génération et de documentation des hypothèses est-il structuré ?",
                    responses=[
                        {"text": "Processus informel et oral", "score": 1, "selected": False},
                        {"text": "Documentation standardisée et validation basique", "score": 3, "selected": True},
                        {"text": "Automatisation IA/ML pour la génération d'hypothèses", "score": 5, "selected": False}
                    ],
                    current_score=3
                )
            ],
            average_score=3.0
        )
        
        return [test_axis]
    
    def _read_csv_with_encoding_detection(self) -> pd.DataFrame:
        """Lit un fichier CSV en détectant automatiquement l'encodage et le séparateur"""
        encodings_to_try = ['utf-8', 'windows-1252', 'iso-8859-1', 'cp1252', 'latin1']
        separators_to_try = [None, ';', ',', '\t']
        
        for encoding in encodings_to_try:
            for sep in separators_to_try:
                try:
                    print(f"🔍 Tentative: encodage={encoding}, séparateur={sep}")
                    if sep is None:
                        df = pd.read_csv(self.file_path, header=None, engine='python', encoding=encoding, sep=None)
                    else:
                        df = pd.read_csv(self.file_path, header=None, encoding=encoding, sep=sep)
                    
                    print(f"✅ Succès avec: encodage={encoding}, séparateur={sep}")
                    return df
                except Exception as e:
                    print(f"❌ Échec avec: encodage={encoding}, séparateur={sep} - {str(e)[:100]}")
                    continue
        
        # Si tout échoue, essayer avec des paramètres très permissifs
        try:
            print("🔍 Tentative finale avec paramètres permissifs")
            df = pd.read_csv(self.file_path, header=None, engine='python', encoding='utf-8', 
                           sep=None, on_bad_lines='skip', encoding_errors='replace')
            return df
        except Exception as e:
            raise Exception(f"Impossible de lire le fichier CSV avec aucun encodage/séparateur: {str(e)}")
    
    def _extract_axes(self, df: pd.DataFrame):
        """Extrait tous les axes du fichier Excel"""
        current_row = 0
        
        while current_row < len(df):
            # Chercher un axe (pattern: "Axe X - Nom")
            axis_match = self._find_axis_pattern(df, current_row)
            
            if axis_match:
                axis_row = axis_match['row']
                axis_name = axis_match['name']
                
                # Extraire la définition de l'axe (ligne suivante)
                definition = self._extract_definition(df, axis_row + 1)
                
                # Extraire les questions de cet axe
                questions = self._extract_questions(df, axis_row + 2)
                
                # Calculer le score moyen de l'axe
                average_score = self._calculate_axis_average(questions)
                
                axis = Axis(
                    name=axis_name,
                    definition=definition,
                    questions=questions,
                    average_score=average_score
                )
                
                self.axes.append(axis)
                
                # Passer à l'axe suivant
                current_row = axis_row + len(questions) * 6 + 10  # Estimation
            else:
                current_row += 1

    # ---------- FORMAT ARCHITECTURE CAPABILITIES (colonnes spécifiques C/E) ----------
    def _extract_axes_architecture(self, df: pd.DataFrame):
        """Extraction adaptée au modèle 'Evaluation Maturité Architecture Capabilities'.
        Hypothèses (d'après l'exemple):
        - Col C contient l'index d'axe sous la forme '1.' '2.' ...
        - Col E contient l'intitulé de l'axe et les questions (lignes se terminant par '?').
        - Col C sur la ligne question peut contenir un niveau sélectionné (1..5) servant de score courant.
        """
        if len(df.columns) < 5:
            return

        def to_str(v: Any) -> str:
            if v is None:
                return ""
            s = str(v).strip()
            return "" if s.lower() in ["nan", "none"] else s

        def to_num(v: Any) -> Optional[float]:
            try:
                if v is None:
                    return None
                s = str(v).strip()
                if s.lower() in ["nan", "none", ""]:
                    return None
                return float(s.replace(',', '.'))
            except Exception:
                return None

        i = 0
        while i < len(df):
            col_c = to_str(df.iloc[i, 2])  # C
            col_e = to_str(df.iloc[i, 4])  # E

            # Début d'axe: C == 'n.' et E non vide
            if re.match(r'^\d+\.?$', col_c) and col_e:
                axis_row = i
                axis_name = f"{col_c} {col_e}".strip()
                # Score de l'axe: colonne D sur la même ligne (si présent)
                axis_row_score = to_num(df.iloc[axis_row, 3]) if len(df.columns) > 3 else None

                # Définition = première ligne non vide en E après l'en-tête
                definition = ""
                j = axis_row + 1
                while j < len(df):
                    txt_e = to_str(df.iloc[j, 4])
                    txt_c = to_str(df.iloc[j, 2])
                    if re.match(r'^\d+\.?$', txt_c) and txt_e:  # Prochain axe
                        break
                    if txt_e and not txt_e.endswith('?'):
                        definition = txt_e
                        break
                    j += 1

                # Questions: lignes E finissant par '?', jusqu'au prochain axe
                questions: List[Question] = []
                q = axis_row + 1
                while q < len(df):
                    txt_e = to_str(df.iloc[q, 4])
                    txt_c = to_str(df.iloc[q, 2])
                    # stop si prochain axe
                    if re.match(r'^\d+\.?$', txt_c) and txt_e:
                        break
                    if txt_e.endswith('?'):
                        current_score = int(to_num(txt_c) or 0)
                        questions.append(Question(
                            question_text=txt_e,
                            responses=[],  # réponses non structurées dans ce modèle
                            current_score=current_score,
                        ))
                    q += 1

                # Score moyen de l'axe: priorité au score de colonne D s'il est présent
                average_score = float(axis_row_score) if axis_row_score is not None else self._calculate_axis_average(questions)
                self.axes.append(Axis(
                    name=axis_name,
                    definition=definition,
                    questions=questions,
                    average_score=average_score,
                ))

                i = q
                continue

            i += 1
    
    def _find_axis_pattern(self, df: pd.DataFrame, start_row: int) -> Optional[Dict]:
        """Trouve le pattern d'un axe dans le DataFrame"""
        print(f"🔍 Recherche d'axes à partir de la ligne {start_row}")
        
        for i in range(start_row, min(start_row + 50, len(df))):
            # Vérifier toutes les colonnes, pas seulement la colonne C
            for col in range(min(5, len(df.columns))):  # Vérifier les 5 premières colonnes
                cell_value = str(df.iloc[i, col]) if len(df.columns) > col else ""
                
                print(f"Ligne {i}, Colonne {col}: '{cell_value}'")
                
                # Patterns plus flexibles pour détecter les axes
                patterns = [
                    r'Axe\s+(\d+)\s*[-–]\s*(.+)',  # "Axe 1 - Hypothèse" ou "Axe 1 – Hypothèse"
                    r'Axe\s+(\d+)\s*:\s*(.+)',    # "Axe 1: Hypothèse"
                    r'Axe\s+(\d+)\s+(.+)',        # "Axe 1 Hypothèse"
                    r'(\d+)\.\s*(.+)',            # "1. Hypothèse"
                ]
                
                for pattern in patterns:
                    match = re.match(pattern, cell_value.strip(), re.IGNORECASE)
                    if match:
                        print(f"✅ Axe trouvé avec pattern '{pattern}': {match.group(2)} à la ligne {i}, colonne {col}")
                        return {
                            'row': i,
                            'number': match.group(1),
                            'name': match.group(2).strip(),
                            'column': col
                        }
        return None

    # ---------- Parsing structuré en enregistrements (axes/questions/réponses) ----------
    def parse_records(self) -> List[Dict[str, Any]]:
        """Parcourt le fichier (CSV/XLSX) et construit une liste d'enregistrements normalisés.
        Chaque enregistrement correspond à une réponse candidate d'une question d'un axe.
        Format: {
          axe: str, axe_score: float|None, question: str,
          answer_type: 'VRAI'|'FAUX'|str, answer_score: float|None, answer_text: str
        }
        """
        if not PANDAS_AVAILABLE:
            return []

        # Charger DataFrame comme dans parse()
        lower_path = self.file_path.lower()
        if lower_path.endswith('.csv'):
            df = self._read_csv_with_encoding_detection()
        else:
            df = pd.read_excel(self.file_path, header=None)

        records: List[Dict[str, Any]] = []
        current_axis: Optional[str] = None
        current_score: Optional[float] = None
        current_question: Optional[str] = None

        def to_str(v: Any) -> str:
            if v is None:
                return ""
            s = str(v).strip()
            return "" if s.lower() in ["nan", "none"] else s

        def to_num(v: Any) -> Optional[float]:
            try:
                if v is None:
                    return None
                s = str(v).strip()
                if s.lower() in ["nan", "none", ""]:
                    return None
                return float(s.replace(',', '.'))
            except Exception:
                return None

        for _, row in df.iterrows():
            col_a = to_str(row[0] if 0 in row.index else None)
            col_b = to_str(row[1] if 1 in row.index else None)
            col_c = to_str(row[2] if 2 in row.index else None)
            col_d = to_str(row[3] if 3 in row.index else None)
            col_e = to_str(row[4] if 4 in row.index else None)

            # Détecter un axe dans la colonne C (ou ailleurs, par prudence)
            axis_candidate_cols = [col_c, col_d]
            if any(re.match(r'(?i)^axe\s*\d+', c) for c in axis_candidate_cols if c):
                current_axis = next(c for c in axis_candidate_cols if c and re.match(r'(?i)^axe\s*\d+', c))
                current_score = to_num(row[1] if 1 in row.index else None)
                continue

            # IMPORTANT: Détecter d'abord les réponses (VRAI/FAUX) AVANT les questions
            # pour éviter qu'une ligne avec VRAI/FAUX soit détectée comme question
            answer_type = None
            answer_col_idx = None
            for idx, val in enumerate([col_a, col_b, col_c]):
                if val.upper() in ["VRAI", "FAUX"]:
                    answer_type = val.upper()
                    answer_col_idx = idx
                    break
            
            # Si c'est une réponse, la traiter immédiatement
            if answer_type and current_axis and current_question:
                # Score de la réponse: voisins du col de la réponse (B/D), fallback B/D
                potential_scores = []
                neighbors = [answer_col_idx - 1, answer_col_idx + 1, 1, 3]
                for n in neighbors:
                    if n == 0:
                        potential_scores.append(to_num(row[0] if 0 in row.index else None))
                    if n == 1:
                        potential_scores.append(to_num(row[1] if 1 in row.index else None))
                    if n == 2:
                        potential_scores.append(to_num(row[2] if 2 in row.index else None))
                    if n == 3:
                        potential_scores.append(to_num(row[3] if 3 in row.index else None))
                    if n == 4:
                        potential_scores.append(to_num(row[4] if 4 in row.index else None))
                answer_score = next((s for s in potential_scores if s is not None), None)

                # Texte de la réponse: colonnes après la balise VRAI/FAUX (D/E) sinon la plus longue
                candidates = [col_d, col_e, col_c, col_b]
                answer_text = max([c for c in candidates if c], key=len, default="")

                records.append({
                    "axe": current_axis,
                    "axe_score": current_score,
                    "question": current_question,
                    "answer_type": answer_type,
                    "answer_score": answer_score,
                    "answer_text": answer_text
                })
                continue  # Passer à la ligne suivante après avoir traité la réponse

            # Détecter une question: soit un entier en B/C suivi d'un texte (C/D)
            # MAIS seulement si ce n'est PAS une réponse (VRAI/FAUX)
            is_question = False
            if re.match(r'^\d+', col_c or "") or re.match(r'^\d+', col_b or ""):
                # Le texte de la question est souvent en D sinon C
                q_text = col_d if col_d else col_c
                if q_text:
                    current_question = q_text
                    is_question = True
            # Autre heuristique: ligne se terminant par '?' en C/D
            if not is_question and ((col_c and col_c.endswith('?')) or (col_d and col_d.endswith('?'))):
                current_question = col_c if col_c.endswith('?') else col_d
                is_question = True
            if is_question:
                continue

        return records
    
    def _extract_definition(self, df: pd.DataFrame, row: int) -> str:
        """Extrait la définition de l'axe"""
        if row < len(df) and len(df.columns) > 2:
            return str(df.iloc[row, 2]).strip()  # Colonne C
        return ""
    
    def _extract_questions(self, df: pd.DataFrame, start_row: int) -> List[Question]:
        """Extrait toutes les questions d'un axe"""
        questions = []
        current_row = start_row
        
        while current_row < len(df):
            # Vérifier si c'est une question (pas un axe suivant)
            if self._is_question(df, current_row):
                question_text = str(df.iloc[current_row, 2]).strip()  # Colonne C
                
                # Extraire les réponses (5 lignes suivantes typiquement)
                responses = self._extract_responses(df, current_row + 1)
                
                # Trouver la réponse sélectionnée et son score
                current_score = self._get_current_score(df, current_row + 1, responses)
                
                question = Question(
                    question_text=question_text,
                    responses=responses,
                    current_score=current_score
                )
                
                questions.append(question)
                current_row += len(responses) + 1
            else:
                break
        
        return questions
    
    def _is_question(self, df: pd.DataFrame, row: int) -> bool:
        """Vérifie si la ligne contient une question"""
        if row >= len(df) or len(df.columns) <= 2:
            return False
        
        cell_value = str(df.iloc[row, 2]).strip()
        
        # Une question commence généralement par "Comment", "Dans quelle mesure", etc.
        question_patterns = [
            r'Comment.*\?',
            r'Dans quelle mesure.*\?',
            r'Quel.*\?',
            r'Quelle.*\?',
            r'Quels.*\?',
            r'Quelles.*\?'
        ]
        
        for pattern in question_patterns:
            if re.search(pattern, cell_value, re.IGNORECASE):
                return True
        
        return False
    
    def _extract_responses(self, df: pd.DataFrame, start_row: int) -> List[Dict[str, Any]]:
        """Extrait les réponses multiples d'une question"""
        responses = []
        
        for i in range(start_row, min(start_row + 10, len(df))):
            if len(df.columns) <= 2:
                break
                
            # Vérifier si c'est une réponse (commence par << et finit par >>)
            response_text = str(df.iloc[i, 2]).strip()  # Colonne C
            
            if response_text.startswith('<<') and response_text.endswith('>>'):
                # Nettoyer le texte de la réponse
                clean_text = response_text[2:-2].strip()
                
                # Vérifier si cette réponse est sélectionnée (colonne A = "VRAI")
                is_selected = False
                if len(df.columns) > 0:
                    selected_value = str(df.iloc[i, 0]).strip().upper()  # Colonne A
                    is_selected = selected_value == "VRAI"
                
                # Extraire le score (colonne B)
                score = 0
                if len(df.columns) > 1:
                    try:
                        score_value = df.iloc[i, 1]
                        if pd.notna(score_value):
                            score = int(float(score_value))
                    except (ValueError, TypeError):
                        pass
                
                responses.append({
                    "text": clean_text,
                    "score": score,
                    "selected": is_selected
                })
            else:
                # Si on ne trouve plus de réponses, arrêter
                break
        
        return responses
    
    def _get_current_score(self, df: pd.DataFrame, start_row: int, responses: List[Dict[str, Any]]) -> int:
        """Trouve le score de la réponse actuellement sélectionnée"""
        for response in responses:
            if response["selected"]:
                return response["score"]
        return 0
    
    def _calculate_axis_average(self, questions: List[Question]) -> float:
        """Calcule le score moyen d'un axe"""
        if not questions:
            return 0.0
        
        total_score = sum(q.current_score for q in questions)
        return total_score / len(questions)
    
    def get_improvement_opportunities(self) -> List[Dict[str, Any]]:
        """Identifie les opportunités d'amélioration"""
        opportunities = []
        total_questions = 0
        questions_with_score_lt_5 = 0
        questions_without_next_level = 0
        
        for axis in self.axes:
            for question in axis.questions:
                total_questions += 1
                current_score = question.current_score
                
                # Debug: Vérifier le score actuel
                if current_score is None:
                    print(f"⚠️ Question sans score: {question.question_text[:50]}...")
                    continue
                
                if current_score < 5:  # Score maximum supposé
                    questions_with_score_lt_5 += 1
                    # Trouver la réponse avec le score immédiatement supérieur
                    next_level_response = self._find_next_level_response(question)
                    
                    if next_level_response:
                        opportunities.append({
                            "axis_name": axis.name,
                            "axis_definition": axis.definition,
                            "question": question.question_text,
                            "current_response": self._get_current_response_text(question),
                            "current_score": question.current_score,
                            "next_level_response": next_level_response["text"],
                            "next_level_score": next_level_response["score"],
                            "improvement_gap": next_level_response["score"] - question.current_score
                        })
                    else:
                        questions_without_next_level += 1
                        print(f"⚠️ Question score {current_score} sans réponse suivante: {question.question_text[:50]}... (réponses: {len(question.responses)})")
        
        print(f"📊 Statistiques opportunités: {total_questions} questions totales, {questions_with_score_lt_5} avec score < 5, {questions_without_next_level} sans réponse suivante, {len(opportunities)} opportunités créées")
        return opportunities
    
    def _find_next_level_response(self, question: Question) -> Optional[Dict[str, Any]]:
        """Trouve la réponse avec le score immédiatement supérieur"""
        current_score = question.current_score
        
        # Trier les réponses par score croissant
        sorted_responses = sorted(question.responses, key=lambda x: x["score"])
        
        # Trouver la première réponse avec un score supérieur
        for response in sorted_responses:
            if response["score"] > current_score:
                return response
        
        return None
    
    def _get_current_response_text(self, question: Question) -> str:
        """Récupère le texte de la réponse actuellement sélectionnée"""
        for response in question.responses:
            if response["selected"]:
                return response["text"]
        return ""
