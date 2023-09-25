import requests

site = "https://persistent.urbanstats.org"


def shorten(full_text):
    response = requests.post(
        f"{site}/shorten",
        data=dict(full_text=full_text),
    )
    return response.json()["shortened"]
