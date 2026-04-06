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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Signature reflects the set identities this hook subscribes to.
    }, [hashObserverSets(observerSets)])
}

// we do this because we're not allowed to change the number of dependencies in a useEffect hook.
// it was producing a warning otherwise.
function hashObserverSets(observerSets: Set<() => void>[]): string {
    return observerSets.map(getObserverSetId).join(',')
}

// identity hashing, using interning.
const observerSetIds = new WeakMap<Set<() => void>, number>()
let nextObserverSetId = 1

function getObserverSetId(observerSet: Set<() => void>): number {
    let id = observerSetIds.get(observerSet)
    if (id === undefined) {
        id = nextObserverSetId
        nextObserverSetId += 1
        observerSetIds.set(observerSet, id)
    }
    return id
}
