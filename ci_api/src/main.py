import datetime

from fastapi import FastAPI
from pydantic import BaseModel

from .totp_counter import TOTPCounter

app = FastAPI()


class TOTPResponse(BaseModel):
    useAfter: int


totp_manager = TOTPCounter()


@app.get("/totp")
def new_code() -> TOTPResponse:
    timestamp_now = datetime.datetime.now().timestamp()
    use_after = totp_manager.next_timestamp(timestamp_now + 5)  # Give 5s buffer time

    return TOTPResponse(useAfter=round(use_after * 1000))
