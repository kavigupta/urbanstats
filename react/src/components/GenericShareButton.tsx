import React, { CSSProperties, ReactNode } from 'react'
import { isFirefox, isMobile } from 'react-device-detect'

import { useColors } from '../page_template/colors'

export function GenericShareButton(props: {
    buttonRef: React.RefObject<HTMLButtonElement>
    produceSummary: () => Promise<[string, string]>
}): ReactNode {
    const colors = useColors()
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- We need to check the condition for browser compatibility.
    const canShare = navigator.canShare?.({ url: 'https://juxtastat.org', text: 'test' }) ?? false
    const isShare = isMobile && canShare && !isFirefox

    return (
        <button
            className="serif"
            style={buttonStyle(colors.hueColors.green, colors.buttonTextWhite)}
            ref={props.buttonRef}
            onClick={async () => {
                const [text, url] = await props.produceSummary()

                async function copyToClipboard(): Promise<void> {
                    await navigator.clipboard.writeText(`${text}\n${url}`)
                    props.buttonRef.current!.textContent = 'Copied!'
                }

                if (isShare) {
                    try {
                        await navigator.share({
                            url,
                            text: `${text}\n`,
                        })
                    }
                    catch {
                        await copyToClipboard()
                    }
                }
                else {
                    await copyToClipboard()
                }
            }}
        >
            <div>{isShare ? 'Share' : 'Copy'}</div>
            <div style={{ marginInline: '0.25em' }}></div>
            <img src="/share.png" className="icon" style={{ width: '1em', height: '1em' }} />
        </button>
    )
}

export function buttonStyle(color: string, textColor: string): CSSProperties {
    return {
        textAlign: 'center',
        fontSize: '2em',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        margin: '0 auto',
        padding: '0.25em 1em',
        backgroundColor: color,
        borderRadius: '0.25em',
        border: 'none',
        color: textColor,
    }
}
