from email.message import EmailMessage
import logging
import smtplib

from app.core.config import get_settings

settings = get_settings()
logger = logging.getLogger("vedastro.security")


def _build_smtp_message(to_email: str, subject: str, body: str) -> EmailMessage:
    message = EmailMessage()
    message["From"] = settings.email_from
    message["To"] = to_email
    message["Subject"] = subject
    message.set_content(body)
    return message


def send_email(to_email: str, subject: str, body: str) -> bool:
    """Send email when SMTP is configured, otherwise silently skip in local dev."""
    if not settings.smtp_host:
        return False

    message = _build_smtp_message(to_email, subject, body)
    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as server:
            if settings.smtp_use_tls:
                server.starttls()
            if settings.smtp_username:
                server.login(settings.smtp_username, settings.smtp_password)
            server.send_message(message)
        return True
    except smtplib.SMTPException as exc:
        logger.warning("SMTP delivery failed for %s: %s", to_email, exc)
    except OSError as exc:
        logger.warning("SMTP connection failed for %s: %s", to_email, exc)
    return False


def send_password_reset_email(to_email: str, reset_token: str) -> bool:
    reset_url = f"{settings.frontend_base_url.rstrip('/')}/login?reset_token={reset_token}&email={to_email}"
    body = (
        "We received a password reset request for your Vedastro account.\n\n"
        f"Reset your password here: {reset_url}\n\n"
        "If you did not request this, you can safely ignore this email."
    )
    return send_email(to_email, "Reset your Vedastro password", body)


def send_email_verification_email(to_email: str, verification_token: str) -> bool:
    verify_url = f"{settings.frontend_base_url.rstrip('/')}/login?verify_token={verification_token}&email={to_email}"
    body = (
        "Verify your Vedastro account email address.\n\n"
        f"Verify here: {verify_url}\n\n"
        "If you did not request this, you can safely ignore this email."
    )
    return send_email(to_email, "Verify your Vedastro email", body)
