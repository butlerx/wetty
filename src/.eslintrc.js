module.exports = {
  env: {
    es6    : true,
    browser: true,
  },
  globals: {
    hterm: true,
    lib  : true,
    io   : true,
  },
  extends: ['airbnb'],
  rules  : {
    'no-underscore-dangle': 0,
    'class-methods-use-this': 0,
    'linebreak-style'     : ['error', 'unix'],
    'arrow-parens'        : ['error', 'as-needed'],
    'no-param-reassign'   : ['error', { props: false }],
    'func-style'          : ['error', 'declaration', { allowArrowFunctions: true }],
    'no-use-before-define': ['error', { functions: false }],
    'no-shadow'           : [
      'error',
      {
        builtinGlobals: true,
        hoist         : 'functions',
        allow         : ['resolve', 'reject', 'err'],
      },
    ],
    'consistent-return': 0,
    'key-spacing'      : [
      'error',
      {
        multiLine: { beforeColon: false, afterColon: true },
        align    : { beforeColon: false, afterColon: true, on: 'colon', mode: 'strict' },
      },
    ],
  },
};
