module.exports = {
	root: true,
	env: {
		es6: true,
		node: true,
	},
	extends: ['plugin:n8n-nodes-base/nodes'],
	parser: '@typescript-eslint/parser',
	parserOptions: {
		ecmaVersion: 2020,
		sourceType: 'module',
	},
	plugins: ['@typescript-eslint'],
	rules: {},
};