# TOTP Timestamp Server

This directory contains a FastAPI HTTP server that provides optimal timing for TOTP (Time-based One-Time Password) usage to prevent rate limiting.

This is used in Urbanstats tests when signing in to Google accounts that require 2FA.

The server tracks TOTP iterations to ensure that each request returns a timestamp for a fresh TOTP window, preventing Google from rate limiting due to reused codes.

## How it works

- TOTP codes are generated in 30-second intervals
- The server maintains an internal counter to track the current iteration
- Each request advances to the next available TOTP interval
- Returns a timestamp indicating when the next fresh TOTP code should be used

## API

### GET /totp

Returns JSON with the following structure:

```json
{
  "useAfter": 1640995230000
}
```

- `useAfter` - Unix timestamp in milliseconds indicating when a fresh TOTP code should be generated and used

## Running the Server

```bash
./run.sh
```

This will:

1. Create a virtual environment
2. Install dependencies from requirements.txt
3. Start the server on port 8080 using uvicorn
