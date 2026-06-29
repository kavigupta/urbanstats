import { TestUtils } from './TestUtils'

export function isMac(): boolean {
    return navigator.userAgent.includes('Mac') && !TestUtils.shared.isTesting
}
