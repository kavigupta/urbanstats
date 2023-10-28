import uuid

import requests

random_data = uuid.uuid4().hex

response = requests.post(
    "https://persistent.urbanstats.org/shorten",
    data=dict(full_text=random_data),
)
response = response.json()
shortened = response.pop("shortened")
assert not response
response = requests.post(
    "https://persistent.urbanstats.org/lengthen",
    data=dict(shortened=shortened),
)
response = response.json()
returned_data = response.pop("full_text")
assert not response, returned_data

assert returned_data == random_data

print("Passed!")
