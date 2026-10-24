export default {
  extends: ['@commitlint/config-conventional'],
  ignores: [(message) => message === 'Initial plan'],
};
