export class DefaultWeakMap<K, V extends WeakKey> {
    private readonly map = new Map<K, WeakRef<V>>()

    get(key: K): V {
        const ref = this.map.get(key)
        const existing = ref?.deref()
        if (existing !== undefined) {
            return existing
        }
        const value = this.makeDefault(key)
        this.map.set(key, new WeakRef(value))
        return value
    }

    constructor(private readonly makeDefault: (key: K) => V) {}
}
