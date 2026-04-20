import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default [
  {
    ignores: [
      "**/node_modules/**",
      "**/.next/**",
      "**/dist/**",
      "**/build/**",
      "**/coverage/**",
      "**/*.d.ts",
      "**/package-lock.json",
    ],
  },
  {
    ...js.configs.recommended,
    files: ["packages/shared/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      "no-debugger": "error",
      "no-duplicate-imports": "error",
    },
  },
  ...tseslint.config({
    files: [
      "apps/client/web/**/*.{ts,tsx}",
      "apps/client/mobile/**/*.{ts,tsx}",
      "qa/**/*.{ts,tsx,mts,cts}",
    ],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
        sourceType: "module",
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      "no-debugger": "error",
      "no-duplicate-imports": "error",
      "no-unreachable": "error",
    },
  }),
];
