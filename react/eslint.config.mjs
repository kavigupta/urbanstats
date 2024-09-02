// @ts-check

import stylistic from '@stylistic/eslint-plugin'
import comments from 'eslint-plugin-eslint-comments'
import importPlugin from 'eslint-plugin-import'
import tseslint from 'typescript-eslint'

export default tseslint.config(
    ...tseslint.configs.strictTypeChecked,
    ...tseslint.configs.stylisticTypeChecked,
    stylistic.configs.customize({
        indent: 4,
    }),
    {
        plugins: {
            import: importPlugin,
        },
        rules: {
            ...importPlugin.configs.recommended.rules,
            ...importPlugin.configs.recommended.typescript,
            'import/order': ['error', {
                'alphabetize': {
                    order: 'asc',
                },
                'newlines-between': 'always',
            }],
            'import/no-unassigned-import': ['error', {
                allow: ['**/*.css'],
            }],
            'import/no-named-as-default-member': 'off',
            'import/namespace': 'off',
        },
        settings: {
            'import/resolver': {
                typescript: true,
                node: true,
            },
            'import/parsers': {
                '@typescript-eslint/parser': ['.ts', '.tsx'],
            },
        },
    },
    {
        plugins: { 'eslint-comments': comments },
        rules: comments.configs.recommended.rules,
    },
    {
        files: ['**/*.{ts,tsx,mts,cts}'],
        rules: {
            'no-undef': 'off',
        },
    },
    {
        ignores: ['**/*.{js,mjs}', 'src/utils/protos.d.ts'],
    },
    {
        rules: {
            '@typescript-eslint/no-require-imports': ['error', { allow: ['\\.json$'] }],
            '@typescript-eslint/no-non-null-assertion': 'off',
            'prefer-template': 'error',
            '@typescript-eslint/restrict-template-expressions': 'off',
            'eslint-comments/no-unused-disable': 'error',
            'no-console': 'error',
            '@stylistic/max-statements-per-line': 'off',
            '@typescript-eslint/no-unnecessary-condition': ['error', { allowConstantLoopConditions: true }],
            '@typescript-eslint/explicit-function-return-type': ['error', { allowExpressions: true }],
            '@typescript-eslint/no-misused-promises': ['error', {
                checksVoidReturn: {
                    attributes: false,
                    arguments: false,
                },
            }],
            'eqeqeq': 'error',
            'guard-for-in': 'error',
            'object-shorthand': 'error',
            'no-restricted-syntax': ['error', 'ExportNamedDeclaration:not([declaration])'],
        },
    },
    {
        languageOptions: {
            parserOptions: {
                parser: '@typescript-eslint/parser',
                project: true,
            },
        },
    },
)
