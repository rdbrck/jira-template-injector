module.exports = {
    "extends": "standard",
    "installedESLint": true,
    "plugins": [
        "standard"
    ],
    "parserOptions": {
        "ecmaVersion": 6,
        "ecmaFeatures": {
            "jsx": true
        }
    },
    "env": {
        "browser": true,
        "jquery": true,
        "es6": true
    },
    "rules": {
        "indent": ["error", 4],
        "semi": ["error", "always", { "omitLastInOneLineBlock": true}],
        "one-var": "off"
    },
    "globals": {
        "utils": false
    }
};