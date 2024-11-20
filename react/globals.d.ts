/* eslint-disable @typescript-eslint/method-signature-style -- These methods require method style to work */
interface ObjectConstructor {
    fromEntries<
        const T extends readonly (readonly [PropertyKey, unknown])[],
    >(
        entries: T,
    ): { [K in T[number] as K[0]]: K[1] }

    entries<const T extends Record<PropertyKey, unknown>>(o: T): (keyof { [K in keyof T as [K, T[K]]]: never })[]
    keys<const T extends Record<PropertyKey, unknown>>(o: T): (keyof T)[]
}
/* eslint-enable @typescript-eslint/method-signature-style */
