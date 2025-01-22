import { Long } from 'protobufjs'

export type NormalizeProto<T> = T extends Long ? number : T extends object ? { [K in keyof T]-?: NormalizeProto<T[K]> } : Exclude<T, null>
