// import eslint from "@eslint/js";

export default [
  // Grunnregler fra ESLint
  // eslint.configs.recommended,

  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
    },

    rules: {
      // Indentering (2 mellomrom)
      "indent": ["warn", 2, { SwitchCase: 1 }],

      // Slå av «kosmetiske» regler
      "linebreak-style": "off",
      "quotes": "off",
      "semi": "off",
      "comma-dangle": "off",
      "object-curly-spacing": "off",
      "array-bracket-spacing": "off",
      "keyword-spacing": "off",
      "space-before-function-paren": "off",
      "no-multiple-empty-lines": "off",
      "padded-blocks": "off",

      // Behold «ordentlige» feil
      "no-unused-vars": "warn",
      "no-undef": "off",
      "no-console": "off",
    },
  },
];