import { useEffect, useState } from 'react'

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
        const [, setCounter] = useState(0)
        useEffect(() => {
            setCounter(counter => counter + 1) // Effect can be delayed, trigger counter again to cover if we missed sets
            const observer = (): void => {
                setCounter(counter => counter + 1)
            }
            this.observers.add(observer)
            return () => {
                this.observers.delete(observer)
            }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- Needs this as the property can change around the effect
        }, [this])
        return this.value
    }
    /* eslint-enable react-hooks/rules-of-hooks */
}
