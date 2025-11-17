export type NormalizeProto<T> = { [K in keyof T]-?: Exclude<NormalizeProto<T[K]>, null> }
export type RemoveOptionals<T> = { [K in keyof T]-?: RemoveOptionals<T[K]> }

export type SwapKeysValues<T extends Record<PropertyKey, PropertyKey>> = { [K in keyof T as T[K]]: K }
