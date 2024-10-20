from functools import lru_cache
from http.cookiejar import CookieJar
import os
from urllib.parse import urlencode

import urllib


@lru_cache(None)
def get_username_password():
    with open(os.path.expanduser("~/.nasapassword"), "r") as f:
        username = f.readline().strip()
        password = f.readline().strip()
    return username, password


def get_nasa_data(url):
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
    response = urllib.request.urlopen(request)
    return response.read()
