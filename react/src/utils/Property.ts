import { useObserverSets } from './useObserverSets'

export class Property<T> {
    private _value: T
    readonly observers = new Set<() => void>()

    readonly id = Math.random().toString(36).substring(2)

    constructor(value: T) {
        this._value = value
    }

    get value(): T {
        return this._value
    }

    set value(newValue: T) {
        this._value = newValue
        this.observers.forEach((observer) => { observer() })
    }

    /* eslint-disable react-hooks/rules-of-hooks -- Custom hook method */
    use(): T {
        useObserverSets([this.observers])
        return this.value
    }
    /* eslint-enable react-hooks/rules-of-hooks */
}
