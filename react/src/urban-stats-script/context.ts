import { Effect, InterpretationError } from './interpreter'
import { LocInfo } from './lexer'
import { USSValue } from './types-values'

export class Context {
    #effect: (eff: Effect) => void
    #error: (msg: string, location: LocInfo) => InterpretationError
    #variables: Map<string, USSValue>

    constructor(effect: (eff: Effect) => void, error: (msg: string, location: LocInfo) => InterpretationError, variables: Map<string, USSValue>) {
        this.#effect = effect
        this.#error = error
        this.#variables = variables
    }

    effect(eff: Effect): void {
        this.#effect(eff)
    }

    error(msg: string, location: LocInfo): InterpretationError {
        return this.#error(msg, location)
    }

    getVariable(name: string): USSValue | undefined {
        return this.#variables.get(name)
    }

    assignVariable(name: string, value: USSValue): void {
        this.#variables.set(name, value)
    }

    variableEntries(): IterableIterator<[string, USSValue]> {
        return this.#variables.entries()
    }

    evolveVariables(variables: Map<string, USSValue>): Context {
        return new Context(
            this.#effect,
            this.#error,
            variables,
        )
    }
}
