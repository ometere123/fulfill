import js from "@eslint/js";
import tseslint from "typescript-eslint";
export default tseslint.config(js.configs.recommended, ...tseslint.configs.recommended, {
  files: ["src/**/*.{ts,tsx}"],
  languageOptions: { globals: { window: "readonly", document: "readonly", location: "readonly", history: "readonly", navigator: "readonly", scrollTo: "readonly", addEventListener: "readonly", removeEventListener: "readonly", FormData: "readonly", Date: "readonly" } },
  rules: { "@typescript-eslint/no-explicit-any": "off", "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }] }
});
