export interface ReadonlyDefaultMap<K, V> extends ReadonlyMap<K, V> {
    get(key: K): V
}

export class DefaultMap<K, V> extends Map<K, V> implements ReadonlyDefaultMap<K, V> {
    override get(key: K): V {
        let result = super.get(key)
        if (result === undefined) {
            result = this.makeDefault(key)
            this.set(key, result)
        }
        return result
    }

    constructor(private readonly makeDefault: (key: K) => V) {
        super()
    }
}
