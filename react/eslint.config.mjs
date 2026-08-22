// @ts-check

import stylistic from '@stylistic/eslint-plugin'
import comments from '@eslint-community/eslint-plugin-eslint-comments'
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
                allow: ['**/*.css', './unit/util/*'],
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
            'import/ignore': ['color', 'json-stable-stringify'],
        },
    },
    {
        plugins: { '@eslint-community/eslint-comments': comments },
        rules: comments.configs.recommended.rules,
    },
    {
        files: ['**/*.{ts,tsx,mts,cts}'],
        rules: {
            'no-undef': 'off',
        },
    },
    {
        ignores: ['**/*.{js,mjs}', 'src/utils/protos.d.ts', 'src/utils/urbanstats-persistent-data.d.ts', 'src/utils/google-drive.d.ts', 'src/data/**', 'cf-og-worker/.wrangler/**'],
    },
    {
        rules: {
            '@typescript-eslint/no-require-imports': ['error', { allow: ['\\.json$'] }],
            '@typescript-eslint/no-non-null-assertion': 'off',
            'prefer-template': 'error',
            '@typescript-eslint/restrict-template-expressions': 'off',
            '@eslint-community/eslint-comments/no-unused-disable': 'error',
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
            'no-restricted-imports': ['error', {
                paths: [{
                    name: 'react-map-gl/maplibre',
                    importNames: ['Layer'],
                    message: 'Use ScreenshotAwareLayer from components/ScreenshotAwareLayer instead, so screenshots wait for the layer to actually be installed.',
                }],
            }],
            'no-restricted-syntax': [
                'error',
                // Good tool for writing these https://typescript-eslint.io/play/
                {
                    selector: 'ExportNamedDeclaration:not([declaration])',
                    message: 'Put `export` on the declaration itself. `export { ... }` lists and re-exports are not used here.',
                },
                {
                    selector: 'MemberExpression[object.name=location][property.name=reload]',
                    message: 'Do not reload the page. Navigate with the Navigator, or in tests use `safeReload` from test_utils.',
                },
                {
                    selector: 'MemberExpression[property.name=replaceState]',
                    message: 'Do not write history entries directly. Navigate with the Navigator, which takes a `history` option.',
                },
                {
                    selector: 'MemberExpression[property.name=pushState]',
                    message: 'Do not write history entries directly. Navigate with the Navigator, which takes a `history` option.',
                },
                {
                    selector: 'MemberExpression[object.name=window][property.name=location]',
                    message: 'Read and change the location through the Navigator and its page descriptors, not `window.location`.',
                },
                {
                    // https://github.com/eslint/eslint/issues/16555
                    selector: 'JSXAttribute[name.name=href][value.value=/^\\u002F.*$/]',
                    message: 'A root-relative href does a full page load. Use the Navigator link props for internal links.',
                },
                {
                    selector: 'JSXText[value=/(^|\\s)((u|U)rban(s|S)tats|urban stats|Urban stats|urban Stats)($|\\s)/]',
                    message: 'Spell the product name "Urban Stats": two words, both capitalized.',
                },
                {
                    selector: 'Literal[value=/(^|\\s)((u|U)rban(s|S)tats|urban stats|Urban stats|urban Stats)($|\\s)/]',
                    message: 'Spell the product name "Urban Stats": two words, both capitalized.',
                },
                {
                    selector: 'JSXOpeningElement[name.name=MathJax]:not(:has(JSXAttribute[name.name=style], JSXAttribute[name.name=inline]))',
                    message: 'Give MathJax an explicit height in `style`, or mark it `inline`, so the page does not reflow once it typesets.',
                },
                // Rules for identifiers
                {
                    selector: 'TSInterfaceDeclaration[id.name=/^[^A-Z]|[^A-Za-z]/]',
                    message: 'Interface names should be PascalCase, letters only.',
                },
                {
                    selector: 'VariableDeclarator > Identifier.id[name=/^[^a-z]|[^A-Za-z0-9]/]',
                    message: 'Variable names should be camelCase.',
                },
                {
                    selector: 'VariableDeclarator > ArrayPattern.id > Identifier.elements[name=/^[^a-z]|[^A-Za-z0-9]/]',
                    message: 'Variable names should be camelCase.',
                },
                {
                    selector: 'FunctionDeclaration > Identifier.id[name=/[^A-Za-z0-9]/]',
                    message: 'Function names should be letters and digits only.',
                },
                {
                    selector: 'FunctionDeclaration > Identifier.params[name=/^[^a-z]|[^A-Za-z0-9]/]',
                    message: 'Parameter names should be camelCase.',
                },
                {
                    selector: 'TSPropertySignature > Identifier.key[name=/^[^a-z]|[^A-Za-z0-9]/]',
                    message: 'Property names should be camelCase.',
                },
                {
                    selector: 'ObjectPattern > Property .value Identifier[name=/^[^a-z]|[^A-Za-z0-9]/]',
                    message: 'Destructured names should be camelCase. Rename on the way out if the source is not.',
                },
                {
                    selector: 'ObjectPattern > Property[shorthand=false] .value[name=/^[^a-z]|[^A-Za-z0-9]/]',
                    message: 'Destructured names should be camelCase. Rename on the way out if the source is not.',
                },
                {
                    selector: 'MethodDefinition > Identifier.key[name=/^[^a-z]|[^A-Za-z0-9]/]',
                    message: 'Method names should be camelCase.',
                },
                {
                    selector: 'FunctionExpression > .params Identifier.parameter[name=/^[^a-z_]|.[^A-Za-z0-9]/]',
                    message: 'Parameter names should be camelCase, or start with an underscore for constructor parameter properties.',
                },
                {
                    selector: 'ArrowFunctionExpression > Identifier.params[name=/^[^a-z_]|^[^_].*[^A-Za-z0-9]/]',
                    message: 'Parameter names should be camelCase, or `_` for one that is unused.',
                },
                {
                    selector: 'TSFunctionType > Identifier.params[name=/^[^a-z]|[^A-Za-z0-9]/]',
                    message: 'Parameter names should be camelCase.',
                },
                {
                    selector: 'CallExpression[arguments.1][callee.property.name=replace]:not([arguments.0.regex.flags=g])',
                    message: '`replace` without a global regex only replaces the first match. Pass a /g regex, or use `replaceAll`.',
                },
                {
                    selector: 'CallExpression[callee.property.name=withText][arguments.0.type=Literal][arguments.0.regex=undefined]',
                    message: '`withText` matches substrings. Use `withExactText` for a string, or pass a regex literal.',
                },
                {
                    selector: 'MemberExpression[object.name=document][property.name=title]',
                    message: 'The document title comes from the page state, which the router applies. The mapper and statistic panels are the exceptions, since their titles change without navigating.',
                },
                {
                    selector: 'CallExpression[callee.object.name=localStorage][callee.property.name=clear]',
                    message: 'Use `safeClearLocalStorage`, which keeps the keys the test harness needs.',
                },
                {
                    selector: 'Literal[value=/^#[0-9A-Fa-f]{3,8}$/]',
                    message: 'Use a color from the theme rather than a hex literal.',
                },
                {
                    selector: 'Literal[value=/^rgb\\(\\s*\\d+\\s*,\\s*\\d+\\s*,\\s*\\d+\\s*\\)$/]',
                    message: 'Use a color from the theme rather than an rgb() literal.',
                },
                {
                    selector: 'Literal[value=/^rgba\\(\\s*\\d+\\s*,\\s*\\d+\\s*,\\s*\\d+\\s*,\\s*[0-9.]+\\)$/]',
                    message: 'Use a color from the theme rather than an rgba() literal.',
                },
                {
                    selector: 'Literal[value=/^(red|green|blue|yellow|orange|purple|pink|brown|black|white|gray|grey|cyan|magenta|lime|navy|olive|teal|aqua|fuchsia|maroon|silver)$/i]',
                    message: 'Use a color from the theme rather than a named color.',
                },
                {
                    // A process signs in once, for about three TOTP codes and 45 seconds, and
                    // then caches the Google session, so every later test and fixture in that
                    // process reuses it for free. What costs is a new process: each test file
                    // is its own CI job, and the code service issues one code per period, so
                    // concurrent jobs queue behind each other. That is why this counts files
                    // rather than fixtures -- add all the fixtures you like to the two that
                    // exist, but a third file buys another sign-in.
                    selector: 'ImportSpecifier[imported.name=quizAuthFixture]',
                    message: 'Auth tests are limited to the two quiz_auth files, because each file is a CI job that signs in, and TOTP codes serialize across jobs.',
                },
                {
                    selector: 'CallExpression[callee.name=useRef][typeArguments.params.0.typeName.name=MapRef]',
                    message: 'Hold the map in state rather than a ref, so renders do not race with the map being attached.',
                },
                {
                    selector: 'Property[key.name=zIndex]:not([value.object.name=zIndex])',
                    message: 'Take z-indexes from the `zIndex` manifest in utils/zIndex, so the stacking order lives in one place.',
                },
                {
                    // Remounting the wrapper loses its screenshot subscription: the render phase snapshots
                    // subscribers up front, so a remounted one stalls it or is never waited on. Change the
                    // `id` instead -- the <Layer> underneath is already keyed on it.
                    selector: 'JSXOpeningElement[name.name=ScreenshotAwareLayer] > JSXAttribute[name.name=key]',
                    message: 'Do not pass `key` to ScreenshotAwareLayer, it must not remount. Change its `id` instead.',
                },
            ],
            'react/prop-types': 'off',
            'no-shadow': 'error',
            '@eslint-community/eslint-comments/require-description': ['error', {
                ignore: ['eslint-enable']
            }],
            "@typescript-eslint/method-signature-style": ["error", "property"], // https://www.totaltypescript.com/method-shorthand-syntax-considered-harmful
            '@typescript-eslint/no-inferrable-types': 'off',
            '@stylistic/yield-star-spacing': ['error', { before: false, after: true }],
            '@typescript-eslint/no-wrapper-object-types': 'off',
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
