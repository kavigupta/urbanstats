act pull_request \
    -s GITHUB_TOKEN="$(gh auth token)" \
    --artifact-server-path $PWD/.artifacts \
    --bind \
    --network bridge \
    --rm \
    --action-offline-mode \
    --concurrent-jobs 8