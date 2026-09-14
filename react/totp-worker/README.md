# TOTP slot worker

Hands the e2e sign-in tests a TOTP time slot each, at `https://dev-totp.urbanstats.org/totp-slot`.
`popTOTP` in [`../test/quiz_auth_test_utils.ts`](../test/quiz_auth_test_utils.ts) is the only caller.

Google will not accept a TOTP code twice, so tests that sign in concurrently cannot all use the
current 30-second step. A Durable Object holds a cursor over steps; each request takes the next one
and gets back the instant to generate at, which the caller sleeps until. Steps are handed out even
when they are minutes out, so a burst of sign-ins queues rather than colliding.

This replaced an Apps Script web app, which ran the script at `/exec` and then 302'd to a
`script.googleusercontent.com` URL carrying the output. Google intermittently refuses to serve that
second URL ([541915738](https://issuetracker.google.com/issues/541915738)), and since an Apps Script
response can carry nothing outside its body — no status code, no headers of its own — a slot lost
that way could not be recovered, only re-requested at the cost of another slot. The step arithmetic
is the Apps Script's, unchanged.

## Deploying

```
npx wrangler deploy --config totp-worker/wrangler.toml
```

from `react/`. Deploying creates the `dev-totp.urbanstats.org` DNS record along with the custom
domain; removing the custom domain deletes it again, so a path-scoped route in place of the custom
domain would leave the hostname unresolvable.

`npx wrangler dev --config totp-worker/wrangler.toml` runs it locally against a local Durable
Object, which is a separate cursor from the deployed one.
