# You may want to update ../../Dockerfile when updating this file
# This version for compatibility with pandas
# Pinned by digest because the tag moves, which invalidates the entire build cache.
# Must stay on bookworm to match the snapshot repo below.
# slim, because the e2e jobs only need python for tests/check_images.py, and the
# non-slim base's build toolchain is 330MB of the image every shard pulls.
FROM python:3.10-slim-bookworm@sha256:7ed92b32353e8d8bd865b5ba811e0315d3999c3b57b1c2df2b504a359d4a1707

# One layer, because /var/lib/apt/lists is 44MB that only the build uses.
RUN apt-get -y update \
    && apt-get -y install --no-install-recommends curl ca-certificates gnupg \
    # 😭
    && curl -fsSL https://deb.nodesource.com/setup_24.x | bash - \
    && apt-get -y install nodejs \
    && dpkg --add-architecture i386 \
    # needed for window resizing in Testcafe. These come from the base image's own repo
    # rather than the snapshot below: libc6:i386 has to match the already-installed libc6
    # exactly, and the snapshot is older than the base image.
    && apt-get -y update \
    && apt-get -y install libc6:i386 libx11-6:i386 \
    # Use only the snapshot repo so all packages come from the same consistent state
    # This is primarily so we can install older Chromium and not have to update all the time
    # The timestamp may need to be bumped if installing newer packages
    && echo 'deb [check-valid-until=no] https://snapshot.debian.org/archive/debian/20260115T000000Z/ bookworm main' \
        > /etc/apt/sources.list \
    # Not *.list: Debian's config is debian.sources, in deb822 format, so the old glob left
    # deb.debian.org enabled and apt took its newer packages over the snapshot's.
    && rm -f /etc/apt/sources.list.d/* \
    && apt-get -o Acquire::Check-Valid-Until=false -y update \
    && apt-get -y install \
        chromium=143.* chromium-common=143.* \
        xvfb \
        sqlite3 \
        fluxbox \
        # the checkout step clones inside the container, and the runner diffs against the
        # base ref; procps is for the pkill in quiz_test_utils.ts
        git procps \
        # needed for downloads directory in TestCafe
        xdg-user-dirs \
        # needed for emoji display in tests
        fonts-noto-color-emoji fonts-noto-core \
    && rm -rf /var/lib/apt/lists/*

# Screenshot comparison is all the Python the e2e jobs do, so they install it here rather
# than restoring the full environment. Last, so editing it doesn't rebuild the apt layers.
COPY requirements_screenshots.txt /tmp/requirements_screenshots.txt
RUN pip3 install -r /tmp/requirements_screenshots.txt && pip3 cache purge

ENTRYPOINT [ "/bin/bash", "-l", "-c" ]
