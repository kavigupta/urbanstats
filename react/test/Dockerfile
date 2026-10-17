# You may want to update ../../Dockerfile when updating this file
# Pinned by digest because a moving tag invalidates the build cache. bookworm to match the snapshot below.
FROM debian:bookworm-slim@sha256:7c7b2c966bc9ee8cedfeef67e0e279108992c77681fa595db4a9d65c06ccc587

# One layer, because /var/lib/apt/lists is 44MB that only the build uses.
RUN apt-get -y update \
    && apt-get -y install --no-install-recommends curl ca-certificates gnupg \
    # 😭
    && curl -fsSL https://deb.nodesource.com/setup_24.x | bash - \
    && apt-get -y install nodejs \
    && dpkg --add-architecture i386 \
    # needed for window resizing in Testcafe. From the base image's repo, since libc6:i386 must
    # match its libc6 exactly and the snapshot is older.
    && apt-get -y update \
    && apt-get -y install libc6:i386 libx11-6:i386 \
    # Use only the snapshot repo so all packages come from the same consistent state
    # This is primarily so we can install older Chromium and not have to update all the time
    # The timestamp may need to be bumped if installing newer packages
    && echo 'deb [check-valid-until=no] https://snapshot.debian.org/archive/debian/20260115T000000Z/ bookworm main' \
        > /etc/apt/sources.list \
    # Not *.list, since Debian's config is debian.sources and would leave deb.debian.org enabled
    && rm -f /etc/apt/sources.list.d/* \
    && apt-get -o Acquire::Check-Valid-Until=false -y update \
    && apt-get -y install \
        chromium=143.* chromium-common=143.* \
        xvfb \
        # so a --docker run can be watched over VNC
        x11vnc \
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

ENTRYPOINT [ "/bin/bash", "-l", "-c" ]
