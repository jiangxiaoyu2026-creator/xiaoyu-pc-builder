const fs = require('fs');
const eslint = require('eslint');

(async function main() {
  const cli = new eslint.ESLint({
    useEslintrc: false,
    overrideConfig: {
      env: { browser: true, es2021: true },
      parserOptions: {
        ecmaVersion: 12,
        sourceType: "module",
        ecmaFeatures: { jsx: true }
      },
      rules: {
        "no-undef": "error"
      }
    }
  });
  const results = await cli.lintFiles(['miniprogram/src/pages/builder/index.tsx']);
  console.log(JSON.stringify(results[0].messages.filter(m => m.ruleId === 'no-undef'), null, 2));
})();
