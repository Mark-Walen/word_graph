/** @type {import('stylelint').Config} */
export default {
  extends: "stylelint-config-standard",
  rules: {
    // Allow Tailwind and related at-rules
    "at-rule-no-unknown": [
      true,
      {
        ignoreAtRules: [
          "tailwind",
          "apply",
          "variants",
          "responsive",
          "screen",
          "layer",
        ],
      },
    ],
  },
};
