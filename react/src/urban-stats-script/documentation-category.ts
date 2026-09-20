export const constantCategories = ['basic', 'color', 'math', 'set', 'string', 'regression', 'mapper', 'logic', 'map', 'plot', 'scale', 'ramp', 'unit', 'inset', 'richText'] as const

export type ConstantCategory = (typeof constantCategories)[number]
