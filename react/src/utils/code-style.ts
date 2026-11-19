import { CSSProperties } from 'react'

// Uses the `--slightly-different-background` CSS var (set globally by `template.tsx`) instead of `useColors()`, so this stays importable from Node-only unit tests.
export const codeStyle: CSSProperties = {
    backgroundColor: 'var(--slightly-different-background)',
    padding: '2px 4px',
    borderRadius: '3px',
    fontFamily: '\'Courier New\', monospace',
    fontSize: '0.9em',
}
