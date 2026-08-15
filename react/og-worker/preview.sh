#!/usr/bin/env bash
# Serves the embed Worker against a local site build, so you can open an article page and follow
# its og:image the way a crawler would.
set -euo pipefail
cd "$(dirname "$0")"

# The site's own dev-server port, so a preview reads the build you are working on rather than
# production. Set SITE_ORIGIN to point somewhere else.
site_port=$(node -e "import('../port.js').then(m => process.stdout.write(String(m.port())))")
site_origin=${SITE_ORIGIN:-http://localhost:$site_port}

# Not PORT: that already means the site's port here, and the two cannot share one.
og_port=${OG_PORT:-8787}

# --local-upstream is what makes the rewritten og:image point back at this server. Without it
# wrangler gives request.url the hostname from the route in wrangler.toml, so following the tag
# would quietly show you the deployed Worker's render instead of your local one.
exec npx wrangler dev \
    --port "$og_port" \
    --local-upstream "localhost:$og_port" \
    --upstream-protocol http \
    --var "SITE_ORIGIN:$site_origin"
