import { useEffect, useRef, useState } from 'react'

import { useOrderedResolve } from './useOrderedResolve'

/**
 * A React hook that debounces the execution of an asynchronous computation function.
 *
 * This hook prevents the compute function from being called too frequently by enforcing
 * a minimum interval between executions. When the compute function needs to be called
 * but hasn't been long enough since the last call, it schedules the execution for later.
 *
 * @template T - The type of the result returned by the compute function
 * @template U - The type of the UI component returned by the ui function
 *
 * @param compute - An async function that performs the computation. Receives the previous
 *                  promise as an optional parameter to allow for chaining or cancellation.
 * @param options - Configuration object containing:
 *   - initial: The initial value to use before any computation completes
 *   - interval: The minimum time in milliseconds between compute function calls
 *   - ui: A function that renders the UI based on the current result and loading state
 *
 * @returns The rendered UI component based on the current state
 *
 * @example
 * ```typescript
 * const searchResults = useDebouncedResolve(
 *   useCallback(() => fetchSearchResults(query), [query]),
 *   {
 *     initial: [],
 *     interval: 300,
 *     ui: (results, loading) => (
 *       <div>
 *         {loading && <Spinner />}
 *         {results.map(result => <ResultItem key={result.id} {...result} />)}
 *       </div>
 *     )
 *   }
 * );
 * ```
 */
export function useDebouncedResolve<T, U>(
    compute: (prev?: Promise<T>) => Promise<T>,
    options: { initial: T, interval: number, ui: (t: T, loading: boolean) => U },
): U {
    const updateTime = useRef(Date.now())

    const [currentGenerator, setCurrentGenerator] = useState<Promise<T>>(Promise.resolve(options.initial))

    useEffect(() => {
        const timeSinceUpdate = Date.now() - updateTime.current
        if (timeSinceUpdate > options.interval) {
            updateTime.current = Date.now()
            setCurrentGenerator(previousGenerator => compute(previousGenerator))
            return
        }
        else {
            updateTime.current = Date.now()
            const timeout = setTimeout(() => {
                setCurrentGenerator(previousGenerator => compute(previousGenerator))
            }, options.interval - timeSinceUpdate)
            return () => {
                clearTimeout(timeout)
            }
        }
    }, [compute, options.interval])

    const { result, loading } = useOrderedResolve(currentGenerator, 'useDebouncedResolve')

    return result !== undefined
        ? options.ui(result, loading)
        : options.ui(options.initial, loading)
}
