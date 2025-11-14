# Guide de Migration Alembic - Ajout des champs d'email et réinitialisation de mot de passe

Ce guide explique comment créer et appliquer la migration pour ajouter les nouveaux champs au modèle User.

## Nouveaux champs à ajouter

- `email_verified` (Boolean, default=False)
- `email_verification_token` (String, nullable)
- `password_reset_token` (String, nullable)
- `password_reset_expires` (DateTime, nullable)

## Étapes pour créer et appliquer la migration

### 1. Naviguer vers le dossier Alembic

```bash
cd backend/src/models/db_schemes/minirag
```

### 2. Vérifier que alembic.ini est configuré

Assurez-vous que le fichier `alembic.ini` existe et contient la bonne URL de base de données :

```ini
sqlalchemy.url = postgresql://username:password@host:port/database_name
```

### 3. Créer la migration automatique

```bash
alembic revision --autogenerate -m "Add email verification and password reset fields to users table"
```

Cette commande va :
- Comparer les modèles SQLAlchemy avec la structure actuelle de la base de données
- Générer automatiquement un fichier de migration dans `alembic/versions/`

### 4. Vérifier le fichier de migration généré

Ouvrez le fichier généré dans `alembic/versions/` et vérifiez qu'il contient bien les ajouts de colonnes :

```python
def upgrade() -> None:
    op.add_column('users', sa.Column('email_verified', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('users', sa.Column('email_verification_token', sa.String(), nullable=True))
    op.add_column('users', sa.Column('password_reset_token', sa.String(), nullable=True))
    op.add_column('users', sa.Column('password_reset_expires', sa.DateTime(timezone=True), nullable=True))
```

### 5. Appliquer la migration

```bash
alembic upgrade head
```

Cette commande va appliquer toutes les migrations en attente à votre base de données.

### 6. Vérifier que la migration a été appliquée

```bash
alembic current
```

Cette commande affiche la version actuelle de la base de données.

## Commandes utiles

- `alembic history` - Voir l'historique des migrations
- `alembic current` - Voir la migration actuelle
- `alembic upgrade head` - Appliquer toutes les migrations
- `alembic downgrade -1` - Annuler la dernière migration (si nécessaire)

## En cas de problème

Si vous rencontrez des erreurs :

1. **Erreur de connexion** : Vérifiez que PostgreSQL est démarré et que les identifiants dans `alembic.ini` sont corrects
2. **Erreur "table already exists"** : Les colonnes existent peut-être déjà. Vérifiez avec `alembic current`
3. **Erreur d'import** : Assurez-vous d'être dans le bon répertoire et que Python peut trouver les modules

## Note importante

⚠️ **Faites une sauvegarde de votre base de données avant d'appliquer la migration en production !**

