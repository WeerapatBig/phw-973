import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // The guide renders arbitrary stored HTML into <img> tags (some pointing at
      // Supabase Storage). next/image cannot optimise those.
      "@next/next/no-img-element": "off",
      // Fonts are loaded with a <link> in the root layout's <head>.
      "@next/next/no-page-custom-font": "off",
    },
  },
  {
    // The editor is a form over a nested document. It edits the draft in place
    // and bumps a version to re-render, so the React Compiler's immutability
    // rule does not fit this pattern.
    files: ["src/app/admin/**/*.{ts,tsx}"],
    rules: {
      "react-hooks/immutability": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;