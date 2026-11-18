from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .utils import HTTPExceptionModel, port

app = FastAPI(responses={500: {"model": HTTPExceptionModel}})

origins = [f"http://localhost:{port()}", "https://urbanstats.org"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=rf"http://[^/]+\.local:{port()}",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# pylint: disable=unused-import
from .routes import email, friends, shorten, stats
