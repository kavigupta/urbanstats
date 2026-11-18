import { TestUtils } from './TestUtils'

// Returns false during TestCafe tests: even on a Mac, TestCafe sends Windows-style
// keyboard events (Ctrl not Cmd), so callers should treat it as non-Mac.
export function isMac(): boolean {
    return navigator.userAgent.includes('Mac') && !TestUtils.shared.isTesting
}
