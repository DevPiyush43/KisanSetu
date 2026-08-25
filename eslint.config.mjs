import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Allow `any` types during prototype phase
      "@typescript-eslint/no-explicit-any": "off",
      // Allow unused vars (cleanup in Phase 2)
      "@typescript-eslint/no-unused-vars": "warn",
      // Allow missing useEffect deps (supabase client is stable)
      "react-hooks/exhaustive-deps": "warn",
      // Allow unescaped entities like apostrophes
      "react/no-unescaped-entities": "off",
      // Allow <img> for user-uploaded lot photos (Phase 2: migrate to next/image)
      "@next/next/no-img-element": "warn",
    },
  },
];

export default eslintConfig;
