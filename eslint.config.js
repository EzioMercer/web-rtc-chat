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
    },
  },
);
