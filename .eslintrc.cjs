/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  extends: ['plugin:@typescript-eslint/recommended'],
  parser: 'vue-eslint-parser',
  parserOptions: {
    parser: '@typescript-eslint/parser',
    sourceType: 'module',
    ecmaVersion: 'latest',
    ecmaFeatures: {
      jsx: true
    }
  },
  plugins: ['@typescript-eslint'],
  rules: {
    '@typescript-eslint/no-explicit-any': 2,
    '@typescript-eslint/no-unused-vars': 2,
    '@typescript-eslint/no-non-null-assertion': 2,
    semi: [2, 'never'],
    quotes: [2, 'single'],
    indent: ['error', 2]
  },
  env: {
    browser: true,
    node: true
  },
}
