interface ObjectConstructor {
    fromEntries<K extends string | number | symbol, V>(entries: Iterable<readonly [K, V]>): Record<K, V>
}
