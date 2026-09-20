import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  { ignores: ['dist', 'src-tauri', 'node_modules'] },
  js.configs.recommended,
  ...tseslint.configs['flat/recommended'],
  reactHooks.configs.flat.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2021,
      sourceType: 'module',
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'no-mixed-spaces-and-tabs': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
];
