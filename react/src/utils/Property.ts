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

export class StoredProperty<T> extends Property<T> {
    constructor(readonly localStorageKey: string, load: (storageValue: string | null) => T, private readonly store: (value: T) => string | null) {
        super(load(localStorage.getItem(localStorageKey)))
        const listener = (event: StorageEvent): void => {
            if (event.key === localStorageKey) {
                this.value = load(localStorage.getItem(localStorageKey))
            }
        }
        addEventListener('storage', listener)
    }

    override get value(): T {
        return super.value
    }

    override set value(newValue: T) {
        const storeValue = this.store(newValue)
        if (storeValue === null) {
            localStorage.removeItem(this.localStorageKey)
        }
        else {
            localStorage.setItem(this.localStorageKey, storeValue)
        }
        super.value = newValue
    }
}
