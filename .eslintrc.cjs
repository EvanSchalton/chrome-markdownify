module.exports = {
  root: true,
  env: { browser: true, es2020: true, node: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
    'plugin:react/recommended',
    'airbnb',
    'prettier',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh', 'react', '@typescript-eslint', 'import'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    'react/jsx-filename-extension': 'off',
    'import/extensions': 'off',
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-shadow': 'off',
    '@typescript-eslint/no-shadow': 'error',
    'import/no-extraneous-dependencies': 'off',
    'react/react-in-jsx-scope': 'off',
    'no-console': 'off', // Chrome extensions need console for debugging
    'no-use-before-define': 'off', // Functions can be used before definition
    '@typescript-eslint/no-use-before-define': 'off',
    '@typescript-eslint/no-explicit-any': 'off', // Chrome APIs often require any
    'class-methods-use-this': 'off', // Utility classes don't always need this
    'no-param-reassign': 'off', // Sometimes needed for DOM manipulation
    'no-restricted-syntax': 'off', // Allow for...of loops
    'import/order': 'off', // Not critical for functionality
    'jsx-a11y/label-has-associated-control': 'off', // Accessibility rule
    'react/no-unescaped-entities': 'off', // Allow quotes in JSX
    'react-hooks/exhaustive-deps': 'warn', // Downgrade to warning
    'no-undef': 'off', // TypeScript handles this
    '@typescript-eslint/ban-types': 'warn', // Downgrade Function type warning
    'no-plusplus': 'off', // Allow ++ operator
  },
  globals: {
    chrome: 'readonly',
  },
  settings: {
    'import/parsers': {
      '@typescript-eslint/parser': ['.ts', '.tsx'],
    },
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
        project: './tsconfig.json',
      },
    },
  },
};
