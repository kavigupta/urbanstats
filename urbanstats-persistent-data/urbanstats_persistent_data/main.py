from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .utils import HTTPExceptionModel

app = FastAPI(responses={500: {"model": HTTPExceptionModel}})

origins = ["http://localhost:8000", "https://urbanstats.org"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# pylint: disable=unused-import
from .routes import email, friends, shorten, stats
