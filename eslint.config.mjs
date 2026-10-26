import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Supabase is only reachable from Route Handlers; see AGENTS.md rule 1.
    files: ["**/*.{ts,tsx}"],
    ignores: ["app/api/**", "lib/supabase/**", "proxy.ts", "tests/**", "scripts/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/lib/supabase/*", "**/lib/supabase/*", "@supabase/*"],
              message:
                "Only Route Handlers in app/api/ may use Supabase. Fetch data with useFetch instead.",
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
