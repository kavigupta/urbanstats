## Code coverage with VSCode

Use this extension https://marketplace.visualstudio.com/items?itemName=ryanluker.vscode-coverage-gutters

And add this configuration to your `.vscode/setings.json`:

```json
"coverage-gutters.coverageBaseDir": "react/**",
"coverage-gutters.coverageFileNames": [
     "lcov.info",
    "cov.xml",
    "coverage.xml",
    "jacoco.xml",
    "coverage.cobertura.xml",
    "clover.xml"
],
```

Then find the `Coverage Gutters: Display Coverage` command in your command pallete.
