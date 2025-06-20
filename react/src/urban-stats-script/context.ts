import assert from 'assert'

import { Effect, InterpretationError } from './interpreter'
import { LocInfo } from './lexer'
import { USSValue } from './types-values'

export class Context {
    #effect: (eff: Effect) => void
    #error: (msg: string, location: LocInfo) => InterpretationError
    #constants: Map<string, USSValue>
    #variables: Map<string, USSValue>
    #theoreticalIdentifiers = new Set<string>()

    constructor(effect: (eff: Effect) => void, error: (msg: string, location: LocInfo) => InterpretationError, constants: Map<string, USSValue>, variables: Map<string, USSValue>) {
        this.#effect = effect
        this.#error = error
        this.#constants = constants
        this.#variables = variables
        this.#theoreticalIdentifiers = new Set<string>()
        for (const name of variables.keys()) {
            assert(!constants.has(name), `Variable name "${name}" conflicts with a constant`)
        }
    }

    effect(eff: Effect): void {
        this.#effect(eff)
    }

    error(msg: string, location: LocInfo): InterpretationError {
        return this.#error(msg, location)
    }

    getVariable(name: string): USSValue | undefined {
        if (this.#constants.has(name)) {
            return this.#constants.get(name)
        }
        return this.#variables.get(name)
    }

    assignVariable(name: string, value: USSValue): string | undefined {
        if (this.#constants.has(name)) {
            return `Cannot assign to constant "${name}"`
        }
        this.#variables.set(name, value)
        return undefined
    }

    addTheoreticalIdentifier(name: string): void {
        if (this.#constants.has(name) || this.#variables.has(name)) {
            return
        }
        this.#theoreticalIdentifiers.add(name)
    }

    variableEntries(): IterableIterator<[string, USSValue]> {
        return this.#variables.entries()
    }

    *allIdentifiers(): Generator<string> {
        for (const constant of this.#constants.keys()) {
            yield constant
        }
        for (const variable of this.#variables.keys()) {
            yield variable
        }
    }

    *allIdentifiersInclTheoretical(): Generator<string> {
        for (const name of this.allIdentifiers()) {
            yield name
        }
        for (const extra of this.#theoreticalIdentifiers) {
            yield extra
        }
    }

    evolveVariables(variables: Map<string, USSValue>): Context {
        return new Context(
            this.#effect,
            this.#error,
            this.#constants,
            variables,
        )
    }
}
