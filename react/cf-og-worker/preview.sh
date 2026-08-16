#!/usr/bin/env bash
# Serves the embed Worker against a local site build.
set -euo pipefail
cd "$(dirname "$0")"

# Defaults to the site's own dev-server port. Set SITE_ORIGIN to point somewhere else.
site_port=$(node -e "import('../port.js').then(m => process.stdout.write(String(m.port())))")
site_origin=${SITE_ORIGIN:-http://localhost:$site_port}

# Not PORT: that already means the site's port here, and the two cannot share one.
og_port=${OG_PORT:-8787}

# Wrangler would put this on 9229 whatever --port says, so two checkouts would collide on it.
inspector_port=$((og_port + 1))

# Without --local-upstream, request.url gets the hostname from the route in wrangler.toml, so the
# rewritten og:image would point at the deployed Worker rather than this one.
exec npx wrangler dev \
    --port "$og_port" \
    --inspector-port "$inspector_port" \
    --local-upstream "localhost:$og_port" \
    --upstream-protocol http \
    --var "SITE_ORIGIN:$site_origin"
