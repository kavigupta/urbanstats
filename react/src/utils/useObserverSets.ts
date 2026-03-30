import { useEffect, useState } from 'react'

/**
 * A React hook that subscribes to multiple observer sets and triggers a re-render
 * whenever any observer in any of the provided sets is called.
 */
export function useObserverSets(observerSets: Set<() => void>[]): void {
    const [, setCounter] = useState(0)
    useEffect(() => {
        setCounter(counter => counter + 1)
        const observer = (): void => {
            setCounter(counter => counter + 1)
        }
        observerSets.forEach(set => set.add(observer))
        return () => {
            observerSets.forEach(set => set.delete(observer))
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- That's fine
    }, observerSets)
}
