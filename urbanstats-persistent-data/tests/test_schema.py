import subprocess

from urbanstats_persistent_data.update_persistent_schema import (
    update_openapi_typescript,
)


def test_schema():
    update_openapi_typescript()
    result = subprocess.run(
        [
            "bash",
            "-c",
            "[ $(git status --porcelain --untracked-files=no -- :/react/src/utils/urbanstats-persistent-data.d.ts | wc -c) -eq 0 ]"
            + " || (git diff -- :/react/src/utils/urbanstats-persistent-data.d.ts; exit 1)",
        ],
        capture_output=True,
        text=True,
        check=False,
    )
    assert (
        result.returncode == 0
    ), f"Please run `python -m urbanstats_persistent_data.update_persistent_schema`\nGit working tree is not clean:\n{result.stdout}\n{result.stderr}"
