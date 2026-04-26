// ESLint flat config — security-only ruleset for the extracted scanner JS.
// We intentionally do NOT enable style/correctness rules (no-unused-vars,
// prefer-const, etc.) because the source is a single very large script that
// pre-dates strict linting; running the full ruleset would generate thousands
// of irrelevant findings. Goal here is XSS / injection / unsafe-pattern
// signal, not code style.

import security from 'eslint-plugin-security';
import noUnsanitized from 'eslint-plugin-no-unsanitized';
import globals from 'globals';

export default [
  {
    files: ['extracted-scripts.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: {
        ...globals.browser,
        // Scanner-specific globals defined inside the same script
        G: 'readonly',
        eid: 'readonly',
        toast: 'readonly',
        addAlert: 'readonly',
        _esc: 'readonly',
      },
    },
    plugins: {
      security,
      'no-unsanitized': noUnsanitized,
    },
    rules: {
      // XSS-focused rules from no-unsanitized:
      //
      //   no-unsanitized/method (document.write, insertAdjacentHTML, etc.)
      //   stays as ERROR — those APIs almost always indicate a real XSS bug
      //   and the false-positive rate is low.
      //
      //   no-unsanitized/property (innerHTML, outerHTML) is set to WARN
      //   instead of ERROR. Roughly ~75 of these in this codebase interpolate
      //   only numbers/bounded enums/internally-computed data and are safe;
      //   making the rule fail the build would force ~75 disable-comments
      //   that add more noise than signal. Triage flow: review the WARN list
      //   in CI logs, escape any new finding with `_esc()` (see
      //   index.html:3863), and if a project-wide audit ever confirms every
      //   call is safe-by-source, promote this back to ERROR.
      'no-unsanitized/method': 'error',
      'no-unsanitized/property': 'warn',

      // Security plugin — turn on the high-signal rules. Several of its rules
      // (object-injection, non-literal-fs-filename) are too noisy for this
      // codebase to be useful, so we leave them off.
      'security/detect-eval-with-expression': 'error',
      'security/detect-non-literal-regexp': 'warn',
      'security/detect-unsafe-regex': 'warn',
      'security/detect-buffer-noassert': 'error',
      'security/detect-child-process': 'error',
      'security/detect-disable-mustache-escape': 'error',
      'security/detect-no-csrf-before-method-override': 'error',
      'security/detect-non-literal-require': 'error',
      'security/detect-possible-timing-attacks': 'warn',
      'security/detect-pseudoRandomBytes': 'error',

      // Native JS rules with security implications
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',
    },
  },
];
