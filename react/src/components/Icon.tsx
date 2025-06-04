/**
 * This only uses the transparency of the icon image to display the specified color.
 */

import React, { ReactNode } from 'react'

export function Icon({ size, color, src }: { size: string, color: string, src: string }): ReactNode {
    return (
        <div style={{ backgroundColor: color, width: size, height: size, maskImage: `url(${src})`, maskRepeat: 'no-repeat', maskSize: 'contain', maskPosition: 'center' }} />
    )
}
