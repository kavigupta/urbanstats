import { useEffect, useState } from 'react'

import { TestUtils } from './TestUtils'

export interface ResolveState<T> {
    promise: Promise<T>
    result: T | undefined
    loading: boolean
}

export function useOrderedResolve<T>(promise: Promise<T>): ResolveState<T> {
    const [state, setState] = useState<ResolveState<T>>({ promise, result: undefined, loading: true })

    useEffect(() => {
        setState(prevState => ({ promise, result: prevState.result, loading: true }))
        TestUtils.shared.startLoading()
        void promise.then(
            (result) => {
                setState(prevState => prevState.promise === promise ? ({ promise, result, loading: false }) : prevState)
            },
            () => {
                setState(prevState => prevState.promise === promise ? ({ promise, result: undefined, loading: false }) : prevState)
            },
        ).finally(() => { TestUtils.shared.finishLoading() })
    }, [promise])

    return state
}
