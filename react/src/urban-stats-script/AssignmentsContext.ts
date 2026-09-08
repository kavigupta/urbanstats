import { createContext, useContext } from 'react'

import { Property } from '../utils/Property'

import { AssignmentsResult } from './workerManager'

/**
 * A run's values, in one box for the page's lifetime. The editor components between a run and its
 * two consumers don't care about them, and a component that renders and then goes stale would keep
 * whichever run it saw alive.
 */
// eslint-disable-next-line no-restricted-syntax -- React contexts typically are capitalized
export const AssignmentsContext = createContext(new Property<AssignmentsResult>({ variables: new Map(), blockValues: new Map() }))

/** Narrow, because a component that renders and then goes stale keeps whatever it read. */
export function useComputedNumber(blockIdent: string): number | undefined {
    const value = useContext(AssignmentsContext).use().blockValues.get(blockIdent)
    return value?.type.type === 'number' ? value.value as number : undefined
}

/** The box itself, for a listener that wants whatever the values are when it fires. */
export function useAssignments(): Property<AssignmentsResult> {
    return useContext(AssignmentsContext)
}
