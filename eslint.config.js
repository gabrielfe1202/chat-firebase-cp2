const tseslint = require('typescript-eslint');

module.exports = tseslint.config(
  { ignores: ['node_modules/**', 'server/**', '.expo/**', 'dist/**'] },
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
);
