# npx openapi-typescript tmp_file -o ./src/urbanstats-persistent-data.d.ts

import json
import os
import subprocess
import tempfile

from .main import app
from fastapi.openapi.utils import get_openapi


def update_openapi_typescript():
    spec = get_openapi(
        title=app.title,
        version=app.version,
        openapi_version=app.openapi_version,
        description=app.description,
        routes=app.routes,
        openapi_prefix=app.openapi_prefix,
    )
    # Make all request and response bodies in the OpenAPI spec required
    for path_item in spec.get("paths", {}).values():
        for operation in path_item.values():
            if isinstance(operation, dict) and "requestBody" in operation:
                operation["requestBody"]["required"] = True
            if isinstance(operation, dict) and "responses" in operation:
                for response in operation["responses"].values():
                    if isinstance(response, dict) and "content" in response:
                        response["required"] = True

    with tempfile.NamedTemporaryFile(
        mode="w", delete=False, suffix=".json"
    ) as tmp_file:
        json.dump(spec, tmp_file)
        print(f"Spec written to temporary file: {tmp_file.name}")

    react_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../react"))
    subprocess.run(
        [
            "npx",
            "openapi-typescript",
            tmp_file.name,
            "-o",
            "./src/utils/urbanstats-persistent-data.d.ts",
        ],
        cwd=react_dir,
        check=True,
    )


if __name__ == "__main__":
    update_openapi_typescript()
