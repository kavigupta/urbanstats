import os
import urllib
from functools import lru_cache
from http.cookiejar import CookieJar
from typing import cast


@lru_cache(None)
def get_username_password() -> tuple[str, str]:
    with open(os.path.expanduser("~/.nasapassword"), "r") as f:
        username = f.readline().strip()
        password = f.readline().strip()
    return username, password


def get_nasa_data(url: str) -> bytes:
    username, password = get_username_password()
    password_manager = urllib.request.HTTPPasswordMgrWithDefaultRealm()
    password_manager.add_password(
        None, "https://urs.earthdata.nasa.gov", username, password
    )
    cookie_jar = CookieJar()
    opener = urllib.request.build_opener(
        urllib.request.HTTPBasicAuthHandler(password_manager),
        urllib.request.HTTPCookieProcessor(cookie_jar),
    )
    urllib.request.install_opener(opener)
    request = urllib.request.Request(url)
    with urllib.request.urlopen(request) as response:
        return cast(bytes, response.read())
