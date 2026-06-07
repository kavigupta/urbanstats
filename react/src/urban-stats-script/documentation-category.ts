export const constantCategories = ['basic', 'color', 'math', 'regression', 'mapper', 'logic', 'map', 'scale', 'ramp', 'unit', 'inset', 'richText'] as const

export type ConstantCategory = (typeof constantCategories)[number]
