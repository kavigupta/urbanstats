import base64
import json

import requests

from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.exceptions import InvalidSignature


def info(endpt):
    base_info = requests.get(
        endpt + "/.well-known/openid-configuration", timeout=10
    ).json()
    return base_info


def convert_key(key):
    n_bytes = base64.urlsafe_b64decode(key["n"] + "===")
    n = int.from_bytes(n_bytes, "big")

    e_bytes = base64.urlsafe_b64decode(key["e"] + "===")
    e = int.from_bytes(e_bytes, "big")

    public_key = rsa.RSAPublicNumbers(e, n).public_key(default_backend())
    return public_key


def compute_keys(root):
    keys = requests.get(info(root)["jwks_uri"], timeout=10).json()["keys"]
    return [convert_key(k) for k in keys]


def verify_content(keys, signature, data):
    for key in keys:
        try:
            key.verify(signature, data, padding.PKCS1v15(), hashes.SHA256())
            return True
        except InvalidSignature:
            pass
    return False


def decode_jwt_with_no_verification(jwt_token):
    # from https://spapas.github.io/2023/11/29/openid-connect-tutorial/
    header, payload, _ = jwt_token.split(".")

    decoded_header = base64.urlsafe_b64decode(header + "=" * (-len(header) % 4))
    decoded_payload = base64.urlsafe_b64decode(payload + "=" * (-len(payload) % 4))

    # decoded_signature = base64.urlsafe_b64decode(
    #     signature + "=" * (-len(signature) % 4)
    # )

    # if not verify_content(
    #     compute_keys(root), decoded_signature, (header + "." + payload).encode("utf-8")
    # ):
    #     return None

    return json.loads(decoded_header), json.loads(decoded_payload)


def get_jwt_from_refresh(endpt, client_id, client_secret, refresh_token):
    token_endpoint = info(endpt)["token_endpoint"]
    result = requests.post(
        token_endpoint,
        data={
            "client_id": client_id,
            "client_secret": client_secret,
            "grant_type": "refresh_token",
            # "code": code,
            "refresh_token": refresh_token,
            "redirect_uri": "http://local.urbanstats.org:8000/login.html",
            "access_type": "offline",
        },
        timeout=10,
    )
    return result.json()


def decode_user_with_no_verification(jwt_token):
    """
    Verifies a user, returinng basic metadata. Returns None if the user is not verified.

    :param root: The root URL of the OpenID server.
    :param jwt_token: The JWT token to verify.

    :return: A dictionary with the user metadata (name and email) if the user is verified, None otherwise.
    """
    decoded_token = decode_jwt_with_no_verification(jwt_token)
    if decoded_token is None:
        return None
    _, payload = decoded_token
    return {
        "name": payload["name"],
        "email": payload["email"],
        "email_verified": payload["email_verified"],
        "stable_id": payload["sub"],
    }


def get_jwt(endpt, client_id, client_secret, code):
    token_endpoint = info(endpt)["token_endpoint"]
    result = requests.post(
        token_endpoint,
        data={
            "client_id": client_id,
            "client_secret": client_secret,
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": "http://local.urbanstats.org:8000/login.html",
            "access_type": "offline",
        },
        timeout=10,
    )
    return result.json()["refresh_token"]
