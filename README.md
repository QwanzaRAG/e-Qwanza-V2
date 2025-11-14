# e-Qwanza - Manuel d'Installation

## 📋 Table des matières

1. [Prérequis système](#prérequis-système)
2. [Installation des outils de base](#installation-des-outils-de-base)
3. [Installation du Backend](#installation-du-backend)
4. [Installation du Frontend](#installation-du-frontend)
5. [Configuration des bases de données](#configuration-des-bases-de-données)
6. [Installation de DBeaver](#installation-de-dbeaver-gestionnaire-de-bases-de-données)
7. [Configuration des migrations Alembic](#configuration-des-migrations-alembic)
8. [Configuration des variables d'environnement](#configuration-des-variables-denvironnement)
9. [Démarrage de l'application](#démarrage-de-lapplication)
10. [Vérification de l'installation](#vérification-de-linstallation)

---

## 🔧 Prérequis système

Avant de commencer, assurez-vous d'avoir installé les outils suivants sur votre système :

### Outils requis

- **Python 3.11.0** ou supérieur ([Télécharger Python](https://www.python.org/downloads/))
- **Node.js 18.x** ou supérieur ([Télécharger Node.js](https://nodejs.org/))
- **npm** (inclus avec Node.js) ou **yarn**
- **Git** ([Télécharger Git](https://git-scm.com/downloads))
- **Docker Desktop** ([Télécharger Docker](https://www.docker.com/products/docker-desktop/)) - Optionnel mais recommandé pour les bases de données

### Vérification des installations

Ouvrez un terminal (PowerShell sur Windows, Terminal sur Mac/Linux) et vérifiez que tout est installé :

```bash
python --version    # Doit afficher Python 3.11.0 ou supérieur
node --version      # Doit afficher v18.x.x ou supérieur
npm --version       # Doit afficher une version npm
git --version       # Doit afficher une version git
docker --version    # Doit afficher une version docker (si installé)
```

---

## 📥 Installation des outils de base

### 1. Installation de Python 3.11.0

1. Téléchargez Python 3.11.0 depuis [python.org](https://www.python.org/downloads/)
2. **Important** : Lors de l'installation, cochez la case **"Add Python to PATH"**
3. Vérifiez l'installation : `python --version`

### 2. Installation de Node.js

1. Téléchargez Node.js 18.x LTS depuis [nodejs.org](https://nodejs.org/)
2. Installez Node.js (npm sera installé automatiquement)
3. Vérifiez l'installation : `node --version` et `npm --version`

### 3. Installation de Docker Desktop (Recommandé)

1. Téléchargez Docker Desktop depuis [docker.com](https://www.docker.com/products/docker-desktop/)
2. Installez et démarrez Docker Desktop
3. Vérifiez que Docker fonctionne : `docker --version`

---

## 🚀 Installation du Backend

### 1. Cloner le projet

Ouvrez un terminal et naviguez vers le répertoire où vous souhaitez installer le projet :

```bash
# Sur Windows (PowerShell)
cd Desktop
git clone https://github.com/AkramQwanza/e-Qwanza4.git
cd e-Qwanza4
```

### 2. Créer un environnement virtuel Python

```bash
# Naviguer vers le dossier backend
cd backend\src

# Créer l'environnement virtuel
python -m venv venv

# Activer l'environnement virtuel

# Sur Windows (CMD)
venv\Scripts\activate

# Sur Mac/Linux
source venv/bin/activate
```

**Note** : Si vous obtenez une erreur d'exécution de script sur PowerShell, exécutez d'abord :
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### 3. Installer les dépendances Python

Une fois l'environnement virtuel activé (vous devriez voir `(venv)` dans votre terminal) :

```bash
# Naviguer vers le dossier src
cd src

# Installer les dépendances
pip install --upgrade pip
pip install -r requirements.txt
```

**Note** : L'installation peut prendre plusieurs minutes, notamment pour les packages `torch` et `transformers` qui sont volumineux.

### 4. Installer les dépendances système (si nécessaire)

Certaines bibliothèques Python nécessitent des dépendances système :

#### Sur Windows
- **Tesseract OCR** (requis pour l'extraction de texte depuis les images) :
  1. Téléchargez Tesseract OCR depuis [GitHub - UB-Mannheim/tesseract](https://github.com/UB-Mannheim/tesseract/wiki)
  2. Installez Tesseract OCR (par défaut dans `C:\Program Files\Tesseract-OCR\`)
  3. **Important** : Notez le chemin d'installation, vous en aurez besoin pour configurer le code
  4. Ajoutez Tesseract au PATH système (optionnel mais recommandé) :
     - Ouvrez "Variables d'environnement" dans Windows
     - Ajoutez `C:\Program Files\Tesseract-OCR` à la variable PATH

#### Sur Linux (Ubuntu/Debian)
```bash
sudo apt-get update
sudo apt-get install -y build-essential python3-dev libpq-dev

# Installer Tesseract OCR
sudo apt-get install -y tesseract-ocr
```

#### Sur Mac
```bash
brew install postgresql

# Installer Tesseract OCR
brew install tesseract
```

### 6. Configurer le chemin Tesseract dans le code (Windows uniquement)

Si vous êtes sur Windows et que Tesseract n'est pas dans le PATH, vous devez modifier le fichier `backend/src/Extractore/image.py` :

1. Ouvrez le fichier `backend/src/Extractore/image.py`
2. Trouvez la ligne 12 :
   ```python
   pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
   ```
3. Si Tesseract est installé dans un autre emplacement, modifiez le chemin :
   ```python
   pytesseract.pytesseract.tesseract_cmd = r'VOTRE_CHEMIN_VERS_TESSERACT\tesseract.exe'
   ```

**Note** : Sur Linux et Mac, cette configuration n'est généralement pas nécessaire si Tesseract est dans le PATH système.

---

## 🎨 Installation du Frontend

### 1. Naviguer vers le dossier frontend

Ouvrez un **nouveau terminal** (gardez le terminal du backend ouvert) :

```bash
# Depuis la racine du projet
cd frontend
```

### 2. Installer les dépendances Node.js

```bash
# Installer toutes les dépendances
npm install

# Ou si vous utilisez yarn
yarn install
```

**Note** : L'installation peut prendre quelques minutes.

---

## 🗄️ Configuration des bases de données

Le projet utilise **deux bases de données** :

1. **PostgreSQL avec pgvector** : Base de données principale pour stocker les données de l'application (utilisateurs, projets, conversations, etc.)
2. **Qdrant** : Base de données vectorielle pour stocker et rechercher les embeddings des documents

### Option 1 : Utiliser Docker (Recommandé)

C'est la méthode la plus simple pour démarrer les deux bases de données :

```bash
# Depuis la racine du projet
cd backend/docker

# Démarrer les conteneurs Docker (PostgreSQL et Qdrant)
docker-compose up -d

# Vérifier que les conteneurs sont en cours d'exécution
docker ps
```

Les bases de données seront accessibles sur :
- **PostgreSQL** : `localhost:5432`
- **Qdrant** : `http://localhost:6333` (API REST) et `http://localhost:6334` (gRPC)
- **Qdrant Dashboard** : `http://localhost:6333/dashboard` (interface web)

### Option 2 : Installation manuelle

#### PostgreSQL avec pgvector

1. Téléchargez PostgreSQL depuis [postgresql.org](https://www.postgresql.org/download/)
2. Installez PostgreSQL
3. Installez l'extension pgvector :
   ```bash
   # Sur Linux
   sudo apt-get install postgresql-17-pgvector
   
   # Sur Mac
   brew install pgvector
   ```
4. Créez une base de données et activez l'extension :
   ```sql
   CREATE DATABASE votre_base_de_donnees;
   \c votre_base_de_donnees
   CREATE EXTENSION vector;
   ```

#### Qdrant

1. **Option A : Installation via Docker** (recommandé)
   ```bash
   docker run -p 6333:6333 -p 6334:6334 -v $(pwd)/qdrant_storage:/qdrant/storage qdrant/qdrant
   ```

2. **Option B : Installation binaire**
   - Téléchargez Qdrant depuis [qdrant.tech](https://qdrant.tech/documentation/guides/installation/)
   - Suivez les instructions d'installation pour votre système d'exploitation

3. **Option C : Mode local (fichiers)**
   - Qdrant peut aussi fonctionner en mode local sans serveur
   - Dans ce cas, configurez `VECTOR_DB_PATH` dans le fichier `.env` pour pointer vers un dossier local

---

## 🛠️ Installation de DBeaver (Gestionnaire de bases de données)

DBeaver est un outil gratuit et open-source pour gérer vos bases de données. Il vous permettra de visualiser, modifier et administrer facilement PostgreSQL.

### Installation de DBeaver

1. **Télécharger DBeaver**
   - Allez sur [dbeaver.io/download](https://dbeaver.io/download/)
   - Téléchargez la version Community Edition (gratuite)
   - Installez DBeaver selon votre système d'exploitation

2. **Lancer DBeaver**
   - Ouvrez DBeaver après l'installation

### Configuration de la connexion PostgreSQL dans DBeaver

1. **Créer une nouvelle connexion**
   - Cliquez sur "Nouvelle connexion" (icône prise) ou `Fichier > Nouvelle > Connexion à la base de données`
   - Sélectionnez **PostgreSQL**
   - Cliquez sur "Suivant"

2. **Configurer la connexion**
   - **Hôte** : `localhost`
   - **Port** : `5432`
   - **Base de données** : `postgres` (base par défaut pour créer d'autres bases)
   - **Nom d'utilisateur** : `postgres`
   - **Mot de passe** : Le mot de passe que vous avez défini (ou celui du docker-compose)
   - Cliquez sur "Tester la connexion"
   - Si c'est la première fois, DBeaver vous proposera de télécharger le driver PostgreSQL - acceptez
   - Cliquez sur "Terminer"

### Créer manuellement une base de données PostgreSQL

Une fois connecté à PostgreSQL dans DBeaver, créez votre base de données sur DBeaver

**Note** : Notez le nom de votre base de données (ex: `RAG5`), le nom d'utilisateur (ex: `postgres`) et le mot de passe. Vous en aurez besoin pour configurer le fichier `.env` et `alembic.ini`.

---

## 🔄 Configuration des migrations Alembic

Alembic est un outil de migration de base de données pour SQLAlchemy. Il permet de gérer les changements de schéma de votre base de données de manière versionnée.

### 1. Créer le fichier alembic.ini

Le fichier `alembic.ini` doit être créé dans le dossier `backend/src/models/db_schemes/minirag/` :

```bash
# Depuis la racine du projet
cd backend/src/models/db_schemes/minirag
```

1. **Copier le fichier exemple**
   ```bash
   # Sur Windows (PowerShell)
   Copy-Item alembic.ini.example alembic.ini
   
   # Sur Mac/Linux
   cp alembic.ini.example alembic.ini
   ```

2. **Configurer la connexion à la base de données**
   - Ouvrez le fichier `alembic.ini` avec un éditeur de texte
   - Trouvez la ligne `sqlalchemy.url` (ligne 64 ou 66)
   - Remplacez-la par votre configuration PostgreSQL :

```ini
# Format : postgresql://username:password@host:port/database_name
sqlalchemy.url = postgresql://postgres:minirag2222@localhost:5432/RAG5
```

**Exemple avec vos propres valeurs** :
- Si votre utilisateur est `postgres`
- Si votre mot de passe est `mon_mot_de_passe`
- Si votre base de données s'appelle `RAG5`

Alors la ligne sera :
```ini
sqlalchemy.url = postgresql://postgres:mon_mot_de_passe@localhost:5432/RAG5
```

### 2. Exécuter les migrations

Une fois le fichier `alembic.ini` configuré, vous pouvez exécuter les migrations :

```bash
# Assurez-vous d'être dans le bon dossier
cd backend/src/models/db_schemes/minirag

# Vérifier l'état des migrations
alembic current

# Appliquer toutes les migrations en attente
alembic upgrade head
```

### 3. Commandes Alembic utiles

```bash
# Voir l'historique des migrations
alembic history

# Voir la migration actuelle
alembic current

# Appliquer toutes les migrations
alembic upgrade head

# Revenir à une version précédente
alembic downgrade -1

# Créer une nouvelle migration (après modification des modèles)
alembic revision --autogenerate -m "Description de la migration"
```

**Important** : Assurez-vous que :
- PostgreSQL est démarré et accessible
- La base de données existe (créée avec DBeaver)
- L'extension `vector` est activée dans la base de données
- Les identifiants dans `alembic.ini` correspondent à ceux de votre base de données

---

## ⚙️ Configuration des variables d'environnement

### 1. Créer le fichier .env pour le backend

Créez un fichier `.env` dans le dossier `backend/src/` :

```bash
# Depuis la racine du projet
cd backend/src
```

**Important** : Avant de créer le fichier `.env`, assurez-vous d'avoir :
1. Créé la base de données PostgreSQL avec DBeaver (voir section précédente)
2. Noté le nom de la base de données, le nom d'utilisateur et le mot de passe

Créez le fichier `.env` avec le contenu suivant (adaptez les valeurs selon votre configuration) :

```env
# Configuration de l'application
APP_NAME=e-Qwanza
APP_VERSION=1.0.0

# Configuration des fichiers
FILE_ALLOWED_TYPES=["pdf","docx","pptx","txt","xlsx"]
FILE_MAX_SIZE=10485760
FILE_DEFAULT_CHUNK_SIZE=1000

# Configuration PostgreSQL
# ⚠️ IMPORTANT : Remplacez ces valeurs par celles que vous avez créées dans DBeaver
# - POSTGRES_USERNAME : Le nom d'utilisateur (ex: postgres)
# - POSTGRES_PASSWORD : Le mot de passe de l'utilisateur
# - POSTGRES_MAIN_DATABASE : Le nom de la base de données que vous avez créée (ex: RAG5)
# Ces valeurs doivent correspondre à celles dans alembic.ini
POSTGRES_USERNAME=postgres
POSTGRES_PASSWORD=minirag2222
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_MAIN_DATABASE=RAG5

# Configuration des modèles LLM
GENERATION_BACKEND=openai
EMBEDDING_BACKEND=openai

# Clés API (remplacez par vos vraies clés)
OPENAI_API_KEY=votre_cle_api_openai
OPENAI_API_URL=https://api.openai.com/v1

# Ou si vous utilisez Cohere
# GENERATION_BACKEND=cohere
# EMBEDDING_BACKEND=cohere
# COHERE_API_KEY=votre_cle_api_cohere

# Configuration des modèles
GENERATION_MODEL_ID=gpt-4
EMBEDDING_MODEL_ID=text-embedding-3-small
EMBEDDING_MODEL_SIZE=1536

# Pour Cohere, utilisez :
# GENERATION_MODEL_ID=command-r
# EMBEDDING_MODEL_ID=embed-english-v3.0
# EMBEDDING_MODEL_SIZE=1024

# Configuration de la base de données vectorielle
# Choisissez entre "QDRANT" ou "PGVECTOR"
VECTOR_DB_BACKEND=QDRANT

# Si vous utilisez Qdrant en mode local (fichiers)
VECTOR_DB_PATH=./assets/database/qdrant_db

# Si vous utilisez Qdrant via Docker, vous devrez modifier le code pour utiliser l'URL
# VECTOR_DB_PATH=http://localhost:6333

# Si vous utilisez pgvector, cette variable n'est pas utilisée
VECTOR_DB_DISTANCE_METHOD=cosine
VECTOR_DB_PGVEC_INDEX_THRESHOLD=100

# Configuration de la langue
PRIMARY_LANG=fr
DEFAULT_LANG=fr

# Configuration JWT
JWT_SECRET_KEY=votre_secret_key_jwt_tres_securise
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=900
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7

# Configuration des tokens (optionnel)
INPUT_DAFAULT_MAX_CHARACTERS=4000
GENERATION_DAFAULT_MAX_TOKENS=2000
GENERATION_DAFAULT_TEMPERATURE=0.7

# Configuration Email (pour vérification d'email et réinitialisation de mot de passe)
# Exemple pour Gmail (vous devez créer un "Mot de passe d'application" dans votre compte Google)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=votre_email@gmail.com
SMTP_PASSWORD=votre_mot_de_passe_application_gmail
SMTP_FROM_EMAIL=votre_email@gmail.com
FRONTEND_URL=http://localhost:5173

# Note: Si SMTP_USER et SMTP_PASSWORD ne sont pas configurés, les emails seront simulés (affichés dans la console)
```

### 2. Créer le fichier .env pour le frontend (optionnel)

Si vous devez changer l'URL de l'API backend, créez un fichier `.env` dans le dossier `frontend/` :

```env
VITE_API_BASE_URL=http://localhost:8000
```

---

## 🚀 Démarrage de l'application

### 1. Démarrer les bases de données (si vous utilisez Docker)

```bash
# Depuis backend/docker
cd backend/docker
docker-compose up -d
```

**Important** : Par défaut, le code utilise Qdrant en mode local (fichiers). Pour utiliser Qdrant via Docker, vous devez modifier le fichier `backend/src/stores/vectordb/providers/QdrantDBProvider.py` :

```python
# Ligne 26, remplacer :
self.client = QdrantClient(path=self.db_client)

# Par :
self.client = QdrantClient(url="http://localhost:6333")
```

Ou configurez `VECTOR_DB_PATH=http://localhost:6333` dans votre fichier `.env` et modifiez le code pour détecter si c'est une URL ou un chemin.

### 2. Démarrer le backend

Ouvrez un terminal et :

```bash
# Naviguer vers backend/src
cd backend/src

# Activer l'environnement virtuel (si pas déjà fait)
# Sur Windows (PowerShell)
..\venv\Scripts\Activate.ps1

# Sur Mac/Linux
source ../venv/bin/activate

# Démarrer le serveur FastAPI
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Le backend sera accessible sur : `http://localhost:8000`
- Documentation API : `http://localhost:8000/docs`
- Documentation alternative : `http://localhost:8000/redoc`

### 3. Démarrer le frontend

Ouvrez un **nouveau terminal** et :

```bash
# Naviguer vers frontend
cd frontend

# Démarrer le serveur de développement
npm run dev

# Ou avec yarn
yarn dev
```

Le frontend sera accessible sur : `http://localhost:8080`

---

## ✅ Vérification de l'installation

### Vérifier le backend

1. Ouvrez votre navigateur et allez sur `http://localhost:8000/docs`
2. Vous devriez voir la documentation interactive de l'API FastAPI
3. Testez l'endpoint de santé : `http://localhost:8000/health` (si disponible)

### Vérifier le frontend

1. Ouvrez votre navigateur et allez sur `http://localhost:8080`
2. Vous devriez voir l'interface de l'application
3. Vérifiez que la connexion au backend fonctionne

### Vérifier les bases de données

#### PostgreSQL
```bash
# Si vous utilisez Docker
docker exec -it pgvector psql -U postgres -d eqwanza_db

# Ou avec PostgreSQL installé localement
psql -U postgres -d eqwanza_db
```

#### Qdrant
```bash
# Si vous utilisez Docker, vérifiez que le conteneur est en cours d'exécution
docker ps | grep qdrant

# Accédez au dashboard Qdrant dans votre navigateur
# http://localhost:6333/dashboard

# Ou testez l'API REST
curl http://localhost:6333/collections
```

**Note** : Si vous utilisez Qdrant en mode local (fichiers), vérifiez que le dossier `VECTOR_DB_PATH` existe et est accessible.

---

## 🔍 Dépannage

### Problèmes courants

#### 1. Erreur "Python not found"
- Vérifiez que Python est installé : `python --version`
- Vérifiez que Python est dans le PATH
- Sur Windows, réinstallez Python en cochant "Add Python to PATH"

#### 2. Erreur lors de l'installation de `torch` ou `transformers`
- Ces packages sont volumineux, attendez la fin du téléchargement
- Si l'erreur persiste, installez-les séparément :
  ```bash
  pip install torch --index-url https://download.pytorch.org/whl/cpu
  pip install transformers
  ```

#### 3. Erreur de connexion à la base de données PostgreSQL
- Vérifiez que Docker est démarré : `docker ps`
- Vérifiez que le conteneur PostgreSQL est en cours d'exécution : `docker ps | grep pgvector`
- Vérifiez les identifiants dans le fichier `.env`
- Testez la connexion : `docker exec -it pgvector psql -U postgres -d eqwanza_db`

#### 3b. Erreur de connexion à Qdrant
- Vérifiez que le conteneur Qdrant est en cours d'exécution : `docker ps | grep qdrant`
- Vérifiez que Qdrant est accessible : `curl http://localhost:6333/collections`
- Si vous utilisez Qdrant en mode local, vérifiez que le dossier `VECTOR_DB_PATH` existe
- Si vous utilisez Qdrant via Docker, assurez-vous d'avoir modifié le code pour utiliser l'URL (voir section "Démarrage de l'application")

#### 4. Erreur "Module not found"
- Vérifiez que l'environnement virtuel est activé
- Réinstallez les dépendances : `pip install -r requirements.txt`

#### 5. Erreur CORS dans le navigateur
- Vérifiez que le backend est démarré sur le port 8000
- Vérifiez la configuration CORS dans `main.py`

#### 6. Erreur "Port already in use"
- Arrêtez le processus utilisant le port :
  ```bash
  # Sur Windows
  netstat -ano | findstr :8000
  taskkill /PID <PID> /F
  
  # Sur Mac/Linux
  lsof -ti:8000 | xargs kill
  ```

#### 7. Erreur Tesseract OCR
- **Erreur** : `pytesseract not installed` ou `TesseractNotFoundError`
- **Solution** :
  1. Vérifiez que Tesseract OCR est installé :
     ```bash
     # Sur Windows (dans PowerShell)
     tesseract --version
     
     # Sur Linux/Mac
     tesseract --version
     ```
  2. Si Tesseract n'est pas trouvé :
     - **Windows** : Réinstallez Tesseract depuis [GitHub - UB-Mannheim/tesseract](https://github.com/UB-Mannheim/tesseract/wiki)
     - **Linux** : `sudo apt-get install tesseract-ocr`
     - **Mac** : `brew install tesseract`
  3. Si vous êtes sur Windows, vérifiez que le chemin dans `backend/src/Extractore/image.py` (ligne 12) correspond à votre installation :
     ```python
     pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
     ```
  4. Vérifiez que `pytesseract` est installé :
     ```bash
     pip install pytesseract
     ```

---

## 📚 Ressources supplémentaires

- [Documentation FastAPI](https://fastapi.tiangolo.com/)
- [Documentation React](https://react.dev/)
- [Documentation Docker](https://docs.docker.com/)
- [Documentation PostgreSQL](https://www.postgresql.org/docs/)
- [Documentation MongoDB](https://www.mongodb.com/docs/)

---

## 📝 Notes importantes

1. **Sécurité** : Ne commitez jamais le fichier `.env` contenant vos clés API dans Git
2. **Environnement virtuel** : N'oubliez pas d'activer l'environnement virtuel avant de travailler sur le backend
3. **Ports** : Assurez-vous que les ports suivants sont disponibles :
   - `8000` : Backend FastAPI
   - `8080` : Frontend React
   - `5432` : PostgreSQL
   - `6333` : Qdrant API REST
   - `6334` : Qdrant gRPC
4. **Clés API** : Vous devez obtenir vos propres clés API depuis :
   - OpenAI : [platform.openai.com](https://platform.openai.com/api-keys)
   - Cohere : [dashboard.cohere.com](https://dashboard.cohere.com/)

---

## 🆘 Support

Si vous rencontrez des problèmes lors de l'installation, vérifiez :
1. Que tous les prérequis sont installés
2. Que toutes les dépendances sont installées
3. Que les bases de données sont démarrées
4. Que le fichier `.env` est correctement configuré

Pour plus d'aide, consultez la documentation du projet ou ouvrez une issue sur GitHub.
