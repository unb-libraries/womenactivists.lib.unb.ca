import defineConfig from '@antfu/eslint-config'

export default defineConfig({
  type: 'app',
  ignores: [
    './.husky',
    // Migrated prose content (biographies, essays), not application source —
    // linting it as code/markdown style is meaningless and pathologically
    // slow in aggregate across ~150 files (confirmed while scaffolding).
    './content',
  ],
  typescript: true,
}, {
  rules: {
    'import/consistent-type-specifier-style': ['error', 'prefer-top-level'],
    'ts/consistent-type-definitions': ['off'],
  },
})
