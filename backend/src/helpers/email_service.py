import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from helpers.config import Settings
import secrets
from datetime import datetime, timedelta


def generate_verification_token() -> str:
    """Génère un token de vérification sécurisé"""
    return secrets.token_urlsafe(32)


def generate_reset_token() -> str:
    """Génère un token de réinitialisation sécurisé"""
    return secrets.token_urlsafe(32)


async def send_email(
    settings: Settings,
    to_email: str,
    subject: str,
    html_body: str,
    text_body: str = None
) -> bool:
    """
    Envoie un email via SMTP
    
    Args:
        settings: Configuration de l'application
        to_email: Adresse email du destinataire
        subject: Sujet de l'email
        html_body: Corps de l'email en HTML
        text_body: Corps de l'email en texte brut (optionnel)
    
    Returns:
        True si l'email a été envoyé avec succès, False sinon
    """
    # Si les paramètres SMTP ne sont pas configurés, on simule l'envoi
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        print(f"[EMAIL SIMULÉ] À: {to_email}")
        print(f"[EMAIL SIMULÉ] Sujet: {subject}")
        print(f"[EMAIL SIMULÉ] Corps: {text_body or html_body}")
        return True
    
    try:
        # Créer le message
        message = MIMEMultipart("alternative")
        message["Subject"] = subject
        message["From"] = settings.SMTP_FROM_EMAIL or settings.SMTP_USER
        message["To"] = to_email
        
        # Ajouter le corps en texte brut et HTML
        if text_body:
            part1 = MIMEText(text_body, "plain")
            message.attach(part1)
        
        part2 = MIMEText(html_body, "html")
        message.attach(part2)
        
        # Pour Gmail sur le port 587, on utilise STARTTLS
        # Créer une connexion SMTP et gérer STARTTLS manuellement
        smtp = aiosmtplib.SMTP(
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            use_tls=False,  # Ne pas utiliser TLS direct pour le port 587
        )
        
        # Se connecter
        await smtp.connect()
        
        # Pour le port 587, utiliser STARTTLS
        if settings.SMTP_PORT == 587:
            # Envoyer EHLO
            await smtp.ehlo()
            # Activer STARTTLS (ignorer l'erreur si déjà en TLS)
            try:
                await smtp.starttls()
                # Renvoyer EHLO après STARTTLS
                await smtp.ehlo()
            except Exception as tls_error:
                # Si déjà en TLS, ignorer l'erreur et continuer
                error_msg = str(tls_error)
                if "already using TLS" in error_msg or "Connection already using TLS" in error_msg:
                    # La connexion est déjà sécurisée, continuer sans erreur
                    pass
                else:
                    # Autre erreur, la propager
                    raise
        
        # S'authentifier
        await smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        
        # Envoyer l'email
        await smtp.send_message(message)
        
        # Fermer la connexion
        await smtp.quit()
        
        return True
    except Exception as e:
        print(f"Erreur lors de l'envoi de l'email: {e}")
        import traceback
        traceback.print_exc()
        return False


async def send_verification_email(settings: Settings, email: str, first_name: str, token: str) -> bool:
    """Envoie un email de vérification"""
    verification_url = f"{settings.FRONTEND_URL}/verify-email?token={token}"
    
    subject = "Vérifiez votre adresse email - e-Qwanza"
    
    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(to right, #2563eb, #9333ea); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }}
            .button {{ display: inline-block; padding: 12px 30px; background: linear-gradient(to right, #2563eb, #9333ea); color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
            .footer {{ text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Bienvenue sur e-Qwanza !</h1>
            </div>
            <div class="content">
                <p>Bonjour {first_name},</p>
                <p>Merci de vous être inscrit sur e-Qwanza. Pour activer votre compte, veuillez vérifier votre adresse email en cliquant sur le bouton ci-dessous :</p>
                <div style="text-align: center;">
                    <a href="{verification_url}" class="button">Vérifier mon email</a>
                </div>
                <p>Ou copiez et collez ce lien dans votre navigateur :</p>
                <p style="word-break: break-all; color: #2563eb;">{verification_url}</p>
                <p>Ce lien expirera dans 24 heures.</p>
                <p>Si vous n'avez pas créé de compte sur e-Qwanza, vous pouvez ignorer cet email.</p>
            </div>
            <div class="footer">
                <p>© 2025 e-Qwanza. Tous droits réservés.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    text_body = f"""
    Bonjour {first_name},
    
    Merci de vous être inscrit sur e-Qwanza. Pour activer votre compte, veuillez vérifier votre adresse email en visitant le lien suivant :
    
    {verification_url}
    
    Ce lien expirera dans 24 heures.
    
    Si vous n'avez pas créé de compte sur e-Qwanza, vous pouvez ignorer cet email.
    
    © 2025 e-Qwanza. Tous droits réservés.
    """
    
    return await send_email(settings, email, subject, html_body, text_body)


async def send_password_reset_email(settings: Settings, email: str, first_name: str, token: str) -> bool:
    """Envoie un email de réinitialisation de mot de passe"""
    reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token}"
    
    subject = "Réinitialisation de votre mot de passe - e-Qwanza"
    
    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(to right, #2563eb, #9333ea); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }}
            .button {{ display: inline-block; padding: 12px 30px; background: linear-gradient(to right, #2563eb, #9333ea); color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
            .footer {{ text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }}
            .warning {{ background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Réinitialisation de mot de passe</h1>
            </div>
            <div class="content">
                <p>Bonjour {first_name},</p>
                <p>Vous avez demandé à réinitialiser votre mot de passe pour votre compte e-Qwanza.</p>
                <p>Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe :</p>
                <div style="text-align: center;">
                    <a href="{reset_url}" class="button">Réinitialiser mon mot de passe</a>
                </div>
                <p>Ou copiez et collez ce lien dans votre navigateur :</p>
                <p style="word-break: break-all; color: #2563eb;">{reset_url}</p>
                <div class="warning">
                    <strong>⚠️ Important :</strong> Ce lien expirera dans 1 heure. Si vous n'avez pas demandé cette réinitialisation, ignorez cet email et votre mot de passe restera inchangé.
                </div>
            </div>
            <div class="footer">
                <p>© 2025 e-Qwanza. Tous droits réservés.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    text_body = f"""
    Bonjour {first_name},
    
    Vous avez demandé à réinitialiser votre mot de passe pour votre compte e-Qwanza.
    
    Visitez le lien suivant pour créer un nouveau mot de passe :
    
    {reset_url}
    
    ⚠️ Important : Ce lien expirera dans 1 heure. Si vous n'avez pas demandé cette réinitialisation, ignorez cet email et votre mot de passe restera inchangé.
    
    © 2025 e-Qwanza. Tous droits réservés.
    """
    
    return await send_email(settings, email, subject, html_body, text_body)

