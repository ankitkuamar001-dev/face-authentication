"""OTP email fallback service.

Generates time-limited 6-digit OTPs, stores them in Redis, and sends them
via SMTP. In development mode (SMTP_CONSOLE_OUTPUT=true), prints to stdout.
"""
from __future__ import annotations

import logging
import random
import smtplib
import string
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import redis.asyncio as aioredis

from app.core.config import get_settings
from app.core.redis import get_redis

logger = logging.getLogger(__name__)
settings = get_settings()

OTP_KEY_PREFIX = "otp:"


def _make_otp_key(email: str) -> str:
    return f"{OTP_KEY_PREFIX}{email.lower()}"


def _generate_otp() -> str:
    return "".join(random.choices(string.digits, k=6))


async def send_otp(email: str) -> str:
    """Generate OTP, store in Redis with TTL, and send email. Returns the OTP (for dev)."""
    otp = _generate_otp()
    redis: aioredis.Redis = get_redis()

    key = _make_otp_key(email)
    ttl_seconds = settings.OTP_EXPIRE_MINUTES * 60
    await redis.set(key, otp, ex=ttl_seconds)

    if settings.SMTP_CONSOLE_OUTPUT:
        logger.warning(
            "=== DEV MODE: OTP for %s is: %s (expires in %d min) ===",
            email,
            otp,
            settings.OTP_EXPIRE_MINUTES,
        )
        print(f"\n{'='*50}\n  OTP for {email}: {otp}  (dev mode)\n{'='*50}\n")
    else:
        await _send_email(email, otp)

    return otp


async def verify_otp(email: str, otp: str) -> bool:
    """Verify the OTP for the given email. Deletes it on success (single-use)."""
    redis: aioredis.Redis = get_redis()
    key = _make_otp_key(email)
    stored = await redis.get(key)
    if stored is None:
        return False
    if stored == otp.strip():
        await redis.delete(key)
        return True
    return False


async def _send_email(to_email: str, otp: str) -> None:
    """Send OTP via SMTP in a thread (smtplib is blocking)."""
    import asyncio

    def _smtp_send() -> None:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = "Your Face Auth OTP Code"
        msg["From"] = settings.SMTP_FROM_EMAIL
        msg["To"] = to_email

        html = f"""
        <html><body>
          <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;background:#0f172a;color:#e2e8f0;border-radius:12px;">
            <h2 style="color:#60a5fa">Your One-Time Passcode</h2>
            <p>Use this code to sign in to your Face Auth account:</p>
            <div style="font-size:2.5rem;font-weight:700;letter-spacing:0.5rem;text-align:center;
                        background:#1e293b;padding:20px;border-radius:8px;margin:24px 0;color:#f8fafc">
              {otp}
            </div>
            <p style="color:#94a3b8;font-size:0.875rem">
              This code expires in {settings.OTP_EXPIRE_MINUTES} minutes.<br>
              If you did not request this code, ignore this email.
            </p>
          </div>
        </body></html>
        """
        msg.attach(MIMEText(html, "html"))

        with smtplib.SMTP(settings.SMTP_SERVER, settings.SMTP_PORT) as server:
            server.starttls()
            server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_FROM_EMAIL, to_email, msg.as_string())

    try:
        await asyncio.to_thread(_smtp_send)
        logger.info("OTP email sent to %s", to_email)
    except Exception as exc:
        logger.error("Failed to send OTP email to %s: %s", to_email, exc)
        raise
