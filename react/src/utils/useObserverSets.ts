import { useEffect, useState } from 'react'

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
