import { createContext, useContext } from 'react'

// eslint-disable-next-line no-restricted-syntax -- Context declaration
export const TransposeContext = createContext(false)

export function useTranspose(): boolean {
    return useContext(TransposeContext)
}
