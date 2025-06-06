import { USSValue } from './types-values'

type Constants = Map<string, USSValue>

export const defaultConstants: Constants = new Map<string, USSValue>([
    ['true', { type: { type: 'boolean' }, value: true }] satisfies [string, USSValue],
    ['false', { type: { type: 'boolean' }, value: false }] satisfies [string, USSValue],
    ['null', { type: { type: 'null' }, value: null }] satisfies [string, USSValue],
    ['inf', { type: { type: 'number' }, value: Infinity }] satisfies [string, USSValue],
    ['pi', { type: { type: 'number' }, value: Math.PI }] satisfies [string, USSValue],
    ['E', { type: { type: 'number' }, value: Math.E }] satisfies [string, USSValue],
] satisfies [string, USSValue][])
