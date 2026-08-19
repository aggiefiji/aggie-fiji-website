import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

/**
 * NOTE: Next.js 16 removed automatic linting during `next build`, and `next lint`
 * is gone — `npm run lint` calls eslint directly. That means a problem in this
 * file cannot break the site build; it only affects the lint command.
 *
 * ── WHY THIS NO LONGER USES FlatCompat ──────────────────────────────────────
 * It used to wrap `next/core-web-vitals` and `next/typescript` in FlatCompat.
 * That was correct when eslint-config-next only shipped legacy .eslintrc
 * configs; as of v16 it ships flat configs natively, and handing a flat config
 * array to FlatCompat made ESLint try to validate it against the eslintrc
 * schema. It hit the plugin object's circular reference and died with
 * "Converting circular structure to JSON" — before running a single rule.
 *
 * The failure was quiet in the worst way: `npm run lint` exited non-zero having
 * checked nothing, which reads at a glance a lot like a lint error rather than
 * a lint that never happened. Importing the flat configs directly is both the
 * fix and one dependency fewer (@eslint/eslintrc) to keep patched.
 */
const eslintConfig = [
  // core-web-vitals already includes the base next config, so it is not spread
  // separately — doing both would register the same plugins twice.
  ...nextCoreWebVitals,
  ...nextTypeScript,
  {
    ignores: [".next/**", "node_modules/**", "out/**", "public/**"],
  },
];

export default eslintConfig;
