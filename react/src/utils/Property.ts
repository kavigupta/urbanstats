import { useEffect, useState } from 'react'

export class Property<T> {
    private _value: T
    readonly observers = new Set<() => void>()

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
            const observer = (): void => {
                setCounter(counter => counter + 1)
            }
            this.observers.add(observer)
            return () => {
                this.observers.delete(observer)
            }
        }, [])
        return this.value
    }
    /* eslint-enable react-hooks/rules-of-hooks */
}
