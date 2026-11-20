import js from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// Statements that define a function: declarations, `const f = () => ...`, and their exported forms.
const fnInit = '/^(Arrow)?FunctionExpression$/';
const functionStatements = [
  'function',
  { selector: `VariableDeclaration[declarations.0.init.type=${fnInit}]` },
  { selector: 'ExportNamedDeclaration[declaration.type="FunctionDeclaration"]' },
  { selector: `ExportNamedDeclaration[declaration.declarations.0.init.type=${fnInit}]` },
  { selector: 'ExportDefaultDeclaration[declaration.type=/Function/]' },
];

const loops = ['if', 'for', 'while', 'do', 'switch'];

// Messages must never be saved or sent anywhere but the direct connection. These APIs can do that, so they are
// banned everywhere except the one module that saves the (encrypted) identity and contacts.
const PRIVACY_MESSAGE = 'Messages must stay in memory. Only src/storage/ may touch browser storage.';
const bannedGlobals = [
  'localStorage',
  'sessionStorage',
  'indexedDB',
  'caches',
  'cookieStore',
  'fetch',
  'XMLHttpRequest',
  'WebSocket',
  'EventSource',
  'WebTransport',
];

const banGlobals = (allowed = []) => [
  'error',
  ...bannedGlobals.filter(name => !allowed.includes(name)).map(name => ({ name, message: PRIVACY_MESSAGE })),
];

const banProperties = (allowed = []) => [
  'error',
  ...bannedGlobals.filter(name => !allowed.includes(name)).flatMap(property => [
    { object: 'window', property, message: PRIVACY_MESSAGE },
    { object: 'globalThis', property, message: PRIVACY_MESSAGE },
    { object: 'self', property, message: PRIVACY_MESSAGE },
  ]),
  { object: 'navigator', property: 'sendBeacon', message: PRIVACY_MESSAGE },
  { object: 'navigator', property: 'storage', message: PRIVACY_MESSAGE },
  { object: 'document', property: 'cookie', message: PRIVACY_MESSAGE },
];

const vars = ['const', 'let', 'var'];

export default tseslint.config(
  { ignores: ['dist', 'node_modules'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      globals: globals.browser,
    },
  },
  {
    files: ['**/*.tsx'],
    extends: [reactHooks.configs.flat.recommended, reactRefresh.configs.vite],
  },
  // Formatting (auto-fixable with `npm run lint:fix`).
  stylistic.configs.customize({ indent: 2, quotes: 'single', semi: true, braceStyle: '1tbs', jsx: true }),
  {
    rules: {
      '@stylistic/max-statements-per-line': ['error', { max: 1 }],
      '@stylistic/brace-style': ['error', '1tbs', { allowSingleLine: false }],
      '@stylistic/curly-newline': ['error', { minElements: 1 }],
      '@stylistic/no-floating-decimal': 'error',
      '@stylistic/max-len': ['error', { code: 120, ignoreUrls: true, ignoreRegExpLiterals: true }],
      // Blank lines around ifs, loops and blocks of variable declarations, and around every function.
      // (Later entries win, so the function entries come last.)
      '@stylistic/padding-line-between-statements': [
        'error',
        { blankLine: 'always', prev: '*', next: loops },
        { blankLine: 'always', prev: loops, next: '*' },
        { blankLine: 'always', prev: '*', next: vars },
        { blankLine: 'always', prev: vars, next: '*' },
        { blankLine: 'any', prev: vars, next: vars },
        { blankLine: 'always', prev: functionStatements, next: '*' },
        { blankLine: 'always', prev: '*', next: functionStatements },
      ],
      'curly': ['error', 'all'],
      // Functions are arrow functions: `const f = () => ...`.
      'func-style': ['error', 'expression'],
      'prefer-arrow-callback': 'error',
      // `Boolean(x)`, `Number(x)`, `String(x)` instead of `!!x`, `+x`, `'' + x`.
      'no-implicit-coercion': ['error', { boolean: true, number: true, string: true }],
      'one-var': ['error', 'never'],
      'no-restricted-globals': banGlobals(),
      'no-restricted-properties': banProperties(),
      // Never log message content: only errors and warnings, and those must not include it.
      'no-console': ['error', { allow: ['error', 'warn'] }],
    },
  },
  {
    files: ['src/storage/**'],
    rules: {
      'no-restricted-globals': banGlobals(['indexedDB']),
      'no-restricted-properties': banProperties(['indexedDB']),
    },
  },
  {
    // Fetches TURN credentials, and the site's own version number (from GitHub Pages, which serves the app anyway).
    files: ['src/turn/**', 'src/update/**'],
    rules: {
      'no-restricted-globals': banGlobals(['fetch']),
      'no-restricted-properties': banProperties(['fetch']),
    },
  },
  {
    // The Cloudflare Worker runs on Cloudflare, not in the app.
    files: ['worker/**'],
    languageOptions: { globals: globals.serviceworker },
    rules: {
      'no-restricted-globals': 'off',
      'no-restricted-properties': 'off',
    },
  },
  {
    // Node config files and scripts, not app code.
    files: ['*.config.{js,ts}', 'scripts/**'],
    languageOptions: { globals: globals.node },
    rules: {
      'no-restricted-globals': 'off',
      'no-restricted-properties': 'off',
      'no-console': 'off',
    },
  },
);
