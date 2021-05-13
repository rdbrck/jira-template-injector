module.exports = {
    extends: ['eslint:recommended'],
    plugins: ['prettier'],
    parserOptions: {
        ecmaVersion: 2020,
        ecmaFeatures: {
            jsx: true,
        },
    },
    env: {
        browser: true,
        es6: true,
        worker: true,
    },
    rules: {
        semi: ['error', 'always', { omitLastInOneLineBlock: true }],
        'one-var': 'off',
    },
    globals: {
        utils: false,
    },
};
