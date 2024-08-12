// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.strict,
  ...tseslint.configs.stylistic,
  {
    files: ['**/*.{ts,tsx,mts,cts}'],
    rules: {
      'no-undef': 'off',
    },
  },
  {
    ignores: ['**/*.js', 'src/utils/protos.d.ts'],
  },
  {
    rules: {
      "@typescript-eslint/no-require-imports": ["error", { allow: ['\\.json$']}],
      "@typescript-eslint/no-non-null-assertion": "off"
    }
  }
);