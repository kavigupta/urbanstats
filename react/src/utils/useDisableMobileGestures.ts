import { useEffect } from 'react'

import { useMobileLayout } from './responsive'

export function useDisableMobileGestures(): void {
    const isMobile = useMobileLayout()

    // Lock down scrolling on mobile
    useEffect(() => {
        if (!isMobile) {
            return
        }

        const handler = (e: Event): void => {
            if (e.target instanceof HTMLButtonElement) {
                return
            }
            e.preventDefault()
        }

        const events: string[] = [
            'scroll',
            'touchstart',
            'gesturestart',
            'gesturechange',
            'gestureend',
        ]

        for (const event of events) {
            document.addEventListener(event, handler, { passive: false })
        }

        return () => {
            for (const event of events) {
                document.removeEventListener(event, handler)
            }
        }
    }, [isMobile])
}
