import type { ToolConfig } from '../types/tool.types'
import { evaluate } from 'mathjs'
import { z } from 'zod'

interface CalculatorParams {
  expression: string
}

export const calculatorTool: ToolConfig<CalculatorParams> = {
  name: 'calculator',
  description: '计算数学表达式',
  enabled: true,
  schema: z.object({
    expression: z.string().describe('要计算的数学表达式，例如 "2 + 3 * 4"'),
  }),
  handler: async (params?: CalculatorParams) => {
    if (!params)
      return ''
    const { expression } = params
    try {
      // 使用 mathjs 进行安全的数学表达式计算
      const result = evaluate(expression)
      return `计算结果: ${expression} = ${result}`
    }
    catch {
      return `计算错误: 无法计算表达式 "${expression}"`
    }
  },
}
