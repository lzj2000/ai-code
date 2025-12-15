// @ts-check
import antfu from '@antfu/eslint-config'

export default antfu({
  ignores: [],
  rules: {
    'node/prefer-global/process': 'off',
  },
})
