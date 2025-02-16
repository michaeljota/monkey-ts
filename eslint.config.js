/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import globals from "globals";
import { includeIgnoreFile, fixupPluginRules } from "@eslint/compat";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import effector from "eslint-plugin-effector";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const gitignorePath = resolve(__dirname, ".gitignore");

/** @type {import('eslint').Linter.Config[]} */
export default [
  includeIgnoreFile(gitignorePath),
  { files: ["**/*.{js,mjs,cjs,ts}"] },
  { languageOptions: { globals: globals.browser } },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  effector.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      effector: fixupPluginRules(effector),
    },
    rules: {
      "no-sparse-arrays": "off",
      "@typescript-eslint/restrict-template-expressions": "off",
      "@typescript-eslint/prefer-readonly": "error",
      "effector/no-getState": "off",
      "@typescript-eslint/no-unused-expressions": [
        "error",
        {
          allowShortCircuit: true,
        },
      ],
    },
  },
];
