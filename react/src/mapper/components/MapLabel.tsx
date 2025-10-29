// eslint-disable-next-line import/no-named-as-default, import/default -- These don't like the import
import Quill, { Parchment, Range } from 'quill'
import React, { createContext, ReactNode, RefObject, useContext, useEffect, useId, useRef, useState } from 'react'

import { QuillEditor } from '../../components/QuillEditor'
import { colorThemes } from '../../page_template/color-themes'
import { fromQuillDelta, Label, toQuillDelta } from '../../urban-stats-script/constants/label'
import { Property } from '../../utils/Property'

import { EditInsetsHandles } from './InsetMap'

export function MapLabel({ label, container, editLabel, i, numLabels }: {
    label: Label
    container: RefObject<HTMLDivElement>
    editLabel?: {
        modify: (newLabel: Partial<Label>) => void
        duplicate: () => void
        delete: () => void
        add: () => void
        moveUp: () => void
        moveDown: () => void
    }
    i: number
    numLabels: number
}): ReactNode {
    const selectionProperty = useContext(SelectionContext)
    const selection = selectionProperty.use()

    const divRef = useRef<HTMLDivElement>(null)

    const toolbarId = useId()

    const quillRef = useRef<Quill>()

    const [format, setFormat] = useState<Record<string, unknown>>({})

    useEffect(() => {
        const quill = quillRef.current!
        const listener = (): void => {
            const currentSelection = quill.getSelection(false)
            if (currentSelection !== null) {
                const currentFormat = quill.getFormat(currentSelection.index, currentSelection.length)
                setFormat(currentFormat)
            }
        }
        listener()
        quill.on('editor-change', listener)
        return () => {
            quill.off('editor-change', listener)
        }
    }, [quillRef])

    return (
        <div
            style={{ position: 'absolute',
                left: `${label.bottomLeft[0] * 100}%`,
                bottom: `${label.bottomLeft[1] * 100}%`,
                width: `${(label.topRight[0] - label.bottomLeft[0]) * 100}%`,
                height: `${(label.topRight[1] - label.bottomLeft[1]) * 100}%` }}
            ref={divRef}
        >
            <QuillEditor
                quillRef={quillRef}
                editable={!!editLabel}
                content={toQuillDelta(label.text)}
                onTextChange={(delta) => {
                    editLabel!.modify({ text: fromQuillDelta(delta) })
                }}
                selection={selection?.index === i ? selection.range : null}
                onSelectionChange={(range) => {
                    if (range !== null) {
                        selectionProperty.value = { index: i, range }
                    }
                    else if (selectionProperty.value?.index === i) {
                        selectionProperty.value = undefined
                    }
                }}
                containerStyle={{ width: '100%', height: '100%', backgroundColor: label.backgroundColor, border: `${label.borderWidth}px solid ${label.borderColor}` }}
                toolbar={`#${CSS.escape(toolbarId)}`}
            />
            <div
                id={toolbarId}
                style={{
                    position: 'absolute',
                    bottom: '100%',
                    backgroundColor: `${label.backgroundColor}aa`,
                    border: `${label.borderWidth}px solid ${label.borderColor}`,
                    borderRadius: '5px 5px 0 0',
                }}
            >
                <span className="ql-formats">
                    <FontSelect />
                    <select className="ql-size">
                        {sizes.map(size => <option key={size} value={size} />)}
                    </select>
                    <SizeStyle className="ql-size" />
                </span>
                <span className="ql-formats">
                    <button className="ql-bold"></button>
                    <button className="ql-italic"></button>
                    <button className="ql-underline"></button>
                    <button className="ql-strike"></button>
                </span>
                <span className="ql-formats">
                    <select className="ql-align"></select>
                </span>
                <span className="ql-formats">
                    <ColorButton label={<span style={{ fontSize: '20px' }}>𝑨</span>} color={format.color as (string | undefined) ?? colorThemes['Light Mode'].textMain} setColor={c => quillRef.current?.format('color', c, 'user')} />
                </span>
                <span className="ql-formats">
                    <button className="ql-link"></button>
                    <button className="ql-image"></button>
                    <button className="ql-formula"></button>
                </span>
                <span className="ql-formats">
                    <ColorButton label={<span style={{ fontSize: '12px' }}>bg</span>} color={label.backgroundColor} setColor={c => editLabel?.modify({ backgroundColor: c })} />
                </span>
                <span className="ql-formats">
                    <ColorButton label={<span style={{ fontSize: '12px' }}>border</span>} color={label.borderColor} setColor={c => editLabel?.modify({ borderColor: c })} />
                    <BorderWidthSelect
                        borderWidth={label.borderWidth}
                        setBorderWidth={(newWidth) => {
                            editLabel?.modify({ borderWidth: newWidth })
                        }}
                    />
                </span>
            </div>

            { editLabel && (
                <EditInsetsHandles
                    frame={[...label.bottomLeft, ...label.topRight]}
                    setFrame={(newFrame) => {
                        editLabel.modify({ bottomLeft: [newFrame[0], newFrame[1]], topRight: [newFrame[2], newFrame[3]] })
                    }}
                    container={container}
                    delete={editLabel.delete}
                    duplicate={editLabel.duplicate}
                    add={undefined}
                    shouldHaveCenterHandle={true}
                    /*
                                Allowing reordering on the main map in case you want to put its corner in front of an inset or something
                                it also eliminates the weird edge case where the main map is not the 0th inset
                                */
                    moveUp={i + 1 < numLabels ? () => { editLabel.moveUp() } : undefined}
                    moveDown={i > 0 ? () => { editLabel.moveDown() } : undefined}
                />
            )}
        </div>
    )
}

export interface Selection {
    index: number
    range: Range
}

// eslint-disable-next-line no-restricted-syntax -- React context
export const SelectionContext = createContext(new Property<Selection | undefined>(undefined))

const fonts = [
    { family: 'jost' },
    { family: 'times new roman', displaySize: 10 },
]

const fontAttributor = Quill.import('attributors/style/font') as Parchment.Attributor
fontAttributor.whitelist = fonts.map(f => f.family)
Quill.register(fontAttributor, true)

const sizes = ['10px', '12px', '14px', '16px', '18px', '20px', '24px', '30px', '36px', '48px', '72px', '96px']

const sizeAttributor = Quill.import('attributors/style/size') as Parchment.Attributor
sizeAttributor.whitelist = sizes
Quill.register(sizeAttributor, true)

function SizeStyle({ className }: { className: string }): ReactNode {
    return (
        <style>
            {`.ql-snow .ql-picker.${className} .ql-picker-label[data-value]::before,
.ql-snow .ql-picker.${className} .ql-picker-item[data-value]::before {
  content: attr(data-value) !important;
}
.ql-picker.${className} { width: 60px !important }`}
        </style>
    )
}

function ColorButton({ label, color, setColor }: { label: ReactNode, color: string, setColor: (c: string) => void }): ReactNode {
    return (
        <button
            style={{ display: 'flex', gap: '2px', alignItems: 'center', width: 'fit-content' }}
            onClick={(e) => {
                (e.target as Element).querySelector('input')?.click()
            }}
            tabIndex={-1}
        >
            <span style={{ pointerEvents: 'none', color: colorThemes['Light Mode'].textMain }}>{label}</span>
            <input
                type="color"
                value={color}
                onChange={(e) => {
                    setColor(e.target.value)
                }}
                style={{
                    border: 0,
                    padding: 0,
                    height: '125%',
                    width: '25px',
                }}
            />
        </button>
    )
}

function FontSelect(): ReactNode {
    return (
        <>
            <select className="ql-font">
                {fonts.map(({ family }) => <option key={family} value={family} />)}
            </select>
            <FontStyles />
        </>
    )
}

function FontStyles(): ReactNode {
    return (
        <style>
            {fonts.map(({ family, displaySize }) => {
                const capitalizedFont = family.replaceAll(/\b\w/g, char => char.toUpperCase())
                return `/* Set dropdown font-families */
.ql-snow .ql-picker.ql-font .ql-picker-label[data-value="${family}"]::before,
.ql-snow .ql-picker.ql-font .ql-picker-item[data-value="${family}"]::before{
  font-family: "${family}";
  content: "${capitalizedFont}";
  ${displaySize !== undefined ? `font-size: ${displaySize}px;` : ''}
}
/* Set effect font-families */
.ql-font-${family} {
  font-family: "${family}";
}`
            })}
        </style>
    )
}

function BorderWidthSelect({ borderWidth, setBorderWidth }: { borderWidth: number, setBorderWidth: (w: number) => void }): ReactNode {
    return (
        <>
            <select
                className="borderWidth"
                value={borderWidth}
                onChange={(e) => {
                    setBorderWidth(Number(e.target.value.slice(0, e.target.value.length - 2)))
                }}
            >
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                    <option key={n} value={`${n}px`} />
                ))}
            </select>
            <SizeStyle className="borderWidth" />
        </>
    )
}
