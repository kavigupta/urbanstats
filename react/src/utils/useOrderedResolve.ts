import { useEffect, useState } from 'react'

export function useOrderedResolve<T>(promise: Promise<T>): T | undefined {
    const [state, setState] = useState<{ promise: Promise<T>, result: T | undefined }>({ promise, result: undefined })

    useEffect(() => {
        setState({ promise, result: undefined })
        void promise.then(
            (result) => {
                setState(prevState => prevState.promise === promise ? ({ promise, result }) : prevState)
            },
            () => {
                setState(prevState => prevState.promise === promise ? ({ promise, result: undefined }) : prevState)
            },
        )
    }, [promise])

    return state.result
}
