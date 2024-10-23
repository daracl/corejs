module.exports = {
  env: {
    browser: true,
    es6: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    parser: 'typescript-eslint-parser',
  },
  extends: [
    "airbnb-base",
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:prettier/recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:import/recommended",
    "plugin:import/typescript"
  ],
  plugins: [
    "prettier"
    , "import"
    , "react"
    , "@typescript-eslint"
  ],
  rules: {
    'prettier/prettier': 0
    , "no-use-before-define": "off"
    , 'curly': 2
    , "no-alert": "off"
    , 'class-methods-use-this': 'off'
    , "import/no-extraneous-dependencies": "off"
    , "import/prefer-default-export": "off"
    , 'prefer-destructuring': 0
    , 'newline-before-return': 0
    , 'padding-line-between-statements': 0
    , 'no-useless-constructor': 0
    , 'default-param-last': 1
    , 'react/no-unknown-property': 0
    , 'accessor-pairs': 0
    , 'require-jsdoc': 0
    , 'no-new': 0
    , 'spaced-comment': 0
    , 'complexity': 0
    , "no-continue": 0
    , "no-restricted-syntax": [
      "error",
      {
        "selector": "ForInStatement",
        "message": "for..in loops iterate over the entire prototype chain, which is virtually never what you want. Use Object.{keys,values,entries }, and iterate over the resulting array."
      },
      {
        "selector": "LabeledStatement",
        "message": "Labels are a form of GOTO; using them makes code confusing and hard to maintain and understand."
      },
      {
        "selector": "WithStatement",
        "message": "`with` is disallowed in strict mode because it makes code impossible to predict and optimize."
      }
    ]
    , "import/extensions": [
      "error",
      "ignorePackages",
      {
        "js": "never",
        "jsx": "never",
        "ts": "never",
        "tsx": "never"
      }
    ],
    "import/no-unresolved": "off"
  },
  settings: {
    'import/resolver': {
      node: {
        extensions: [
          '.js',
          '.jsx',
          '.ts',
          '.tsx'
        ],
      }
    },
    react: {
      pragma: 'h',
      version: '16.3',
    }

  },

  // parserOptions: {
  //   ecmaVersion: "latest",
  //   sourceType: "module",
  // },
};
