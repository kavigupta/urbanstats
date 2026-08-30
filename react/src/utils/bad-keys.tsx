import React, { type ReactElement } from 'react'

export function elementsWithBadKeys(): ReactElement[] {
    /* eslint-disable react/jsx-key -- the point of these elements is that their keys are wrong */
    return [
        <div>{[<div key="a" />, <div key="a" />]}</div>,
        <div>{[<div />]}</div>,
    ]
    /* eslint-enable react/jsx-key */
}
