"""
S Panel - SSL Certificate Management Module
Let's Encrypt and self-signed certificate management.
"""

import subprocess
import os
import json
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from auth.middleware import get_current_user

router = APIRouter(prefix="/api/ssl", tags=["ssl"])

CERT_DIR = "/etc/letsencrypt/live"
SELF_SIGNED_DIR = "/etc/ssl/spanel"


def _run_cmd(cmd: str, check: bool = False) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, shell=True, capture_output=True, text=True, check=check)


class SSLRequest(BaseModel):
    domain: str
    email: str = ""


class SelfSignedRequest(BaseModel):
    domain: str
    days: int = 365


@router.get("/certificates")
async def list_certificates(current_user=Depends(get_current_user)):
    """List all SSL certificates."""
    certs = []

    # Let's Encrypt certificates
    if os.path.exists(CERT_DIR):
        for domain in os.listdir(CERT_DIR):
            cert_path = f"{CERT_DIR}/{domain}/fullchain.pem"
            if os.path.exists(cert_path):
                # Get cert info using openssl
                result = _run_cmd(
                    f"openssl x509 -in {cert_path} -noout -dates -subject 2>/dev/null"
                )
                expiry = ""
                subject = ""
                if result.returncode == 0:
                    for line in result.stdout.strip().split('\n'):
                        if 'notAfter' in line:
                            expiry = line.split('=', 1)[1].strip()
                        if 'subject' in line:
                            subject = line.split('=', 1)[1].strip()

                certs.append({
                    "domain": domain,
                    "type": "Let's Encrypt",
                    "path": cert_path,
                    "expiry": expiry,
                    "subject": subject,
                    "auto_renew": True
                })

    # Self-signed certificates
    if os.path.exists(SELF_SIGNED_DIR):
        for f in os.listdir(SELF_SIGNED_DIR):
            if f.endswith('.crt'):
                domain = f.replace('.crt', '')
                cert_path = f"{SELF_SIGNED_DIR}/{f}"
                result = _run_cmd(
                    f"openssl x509 -in {cert_path} -noout -dates 2>/dev/null"
                )
                expiry = ""
                if result.returncode == 0:
                    for line in result.stdout.strip().split('\n'):
                        if 'notAfter' in line:
                            expiry = line.split('=', 1)[1].strip()

                certs.append({
                    "domain": domain,
                    "type": "Self-Signed",
                    "path": cert_path,
                    "expiry": expiry,
                    "auto_renew": False
                })

    return certs


@router.post("/letsencrypt")
async def request_letsencrypt(body: SSLRequest, current_user=Depends(get_current_user)):
    """Request a Let's Encrypt certificate."""
    # Check if certbot is installed
    result = _run_cmd("which certbot")
    if result.returncode != 0:
        raise HTTPException(status_code=400, detail="Certbot is not installed. Install it from Software Store.")

    email_flag = f"--email {body.email}" if body.email else "--register-unsafely-without-email"

    result = _run_cmd(
        f"sudo certbot certonly --nginx -d {body.domain} {email_flag} --agree-tos --non-interactive"
    )

    if result.returncode != 0:
        raise HTTPException(status_code=500, detail=f"Certbot failed: {result.stderr}")

    return {"message": f"SSL certificate for {body.domain} issued successfully"}


@router.post("/self-signed")
async def create_self_signed(body: SelfSignedRequest, current_user=Depends(get_current_user)):
    """Create a self-signed SSL certificate."""
    _run_cmd(f"sudo mkdir -p {SELF_SIGNED_DIR}")

    key_path = f"{SELF_SIGNED_DIR}/{body.domain}.key"
    cert_path = f"{SELF_SIGNED_DIR}/{body.domain}.crt"

    result = _run_cmd(
        f"sudo openssl req -x509 -nodes -days {body.days} -newkey rsa:2048 "
        f"-keyout {key_path} -out {cert_path} "
        f"-subj '/CN={body.domain}/O=S Panel/C=IN'"
    )

    if result.returncode != 0:
        raise HTTPException(status_code=500, detail=f"Failed: {result.stderr}")

    return {
        "message": f"Self-signed certificate created for {body.domain}",
        "cert_path": cert_path,
        "key_path": key_path
    }


@router.delete("/{domain}")
async def delete_certificate(domain: str, current_user=Depends(get_current_user)):
    """Delete an SSL certificate."""
    # Try Let's Encrypt
    _run_cmd(f"sudo certbot delete --cert-name {domain} --non-interactive", check=False)

    # Try self-signed
    _run_cmd(f"sudo rm -f {SELF_SIGNED_DIR}/{domain}.crt {SELF_SIGNED_DIR}/{domain}.key", check=False)

    return {"message": f"Certificate for {domain} deleted"}


@router.post("/renew")
async def renew_certificates(current_user=Depends(get_current_user)):
    """Renew all Let's Encrypt certificates."""
    result = _run_cmd("sudo certbot renew --non-interactive")
    if result.returncode != 0:
        raise HTTPException(status_code=500, detail=result.stderr)
    return {"message": "Certificate renewal completed", "output": result.stdout}
