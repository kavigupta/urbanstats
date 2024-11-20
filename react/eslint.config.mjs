// @ts-check

import stylistic from '@stylistic/eslint-plugin'
import comments from 'eslint-plugin-eslint-comments'
import importPlugin from 'eslint-plugin-import'
import tseslint from 'typescript-eslint'
import reactPlugin from "eslint-plugin-react"
import preferFC from 'eslint-plugin-react-prefer-function-component/config'
import reactHooks from 'eslint-plugin-react-hooks'
import noOnlyTests from 'eslint-plugin-no-only-tests'
import jest from 'eslint-plugin-jest'

export default tseslint.config(
    ...tseslint.configs.strictTypeChecked,
    ...tseslint.configs.stylisticTypeChecked,
    reactPlugin.configs.flat.recommended,
    {
        settings: {
            react: {
                version: 'detect',
            },
        }
    },
    preferFC.configs.recommended,
    {
        plugins: {
            'react-hooks': reactHooks
        },
        rules: reactHooks.configs.recommended.rules
    },
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
            'import/named': 'off',
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
            'no-console': ['error', { "allow": ["warn", "error"] }],
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
            'no-restricted-syntax': [
                'error', 
                'ExportNamedDeclaration:not([declaration])', 
                'MemberExpression[object.name=location][property.name=reload]'
            ],
            'react/prop-types': 'off',
            'no-shadow': 'error',
            'eslint-comments/require-description': ['error', {
                ignore: ['eslint-enable']
            }],
            "@typescript-eslint/method-signature-style": ["error", "property"], // https://www.totaltypescript.com/method-shorthand-syntax-considered-harmful
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
    {
        plugins: {
            'no-only-tests': noOnlyTests
        },
        rules: {
            'no-only-tests/no-only-tests': 'error'
        }
    },
    jest.configs['flat/style'],
    {
        rules: {
            'jest/no-identical-title': 'error' // Prevent default screencap names
        }
    }
)
