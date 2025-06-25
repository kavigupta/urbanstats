from urbanstats_persistent_data.update_persistent_schema import (
    update_openapi_typescript,
)
import subprocess
import os


def test_schema():
    update_openapi_typescript()
    result = subprocess.run(
        [
            "bash",
            "-c",
            "[ $(git status --porcelain --untracked-files=no | wc -c) -eq 0 ]  || (git status; git diff; exit 1)",
        ],
        capture_output=True,
        text=True,
    )
    assert (
        result.returncode == 0
    ), f"Please run `python -m urbanstats_persistent_data.update_persistent_schema`\nGit working tree is not clean:\n{result.stdout}\n{result.stderr}"
