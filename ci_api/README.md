# TOTP Server

This directory contains a simple HTTP server that provides TOTP (Time-based One-Time Password) codes with iteration tracking to prevent reuse.

This is used in Urbanstats tests when signing in to a Google account.

If we don't track TOTP usage, Google will rate limit us when entering already used TOTP codes.

## API Response

The server returns JSON with the following structure:

```json
{
  "code": "123456",
  "useAfter": 1640995230000
}
```

- `code` - 6-digit TOTP code
- `useAfter` - Unix timestamp in milliseconds indicating when the code should be used
