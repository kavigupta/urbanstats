interface ObjectConstructor {
    fromEntries<
        const T extends readonly (readonly [PropertyKey, unknown])[],
    >(
        entries: T,
    ): { [K in T[number] as K[0]]: K[1] }
}
