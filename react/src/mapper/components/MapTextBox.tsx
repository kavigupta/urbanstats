import Color from 'color'
// eslint-disable-next-line import/no-named-as-default, import/default -- These don't like the import
import Quill, { Delta, Parchment, Range } from 'quill'
import React, { createContext, ReactNode, RefObject, useCallback, useContext, useEffect, useRef, useState } from 'react'

import { QuillEditor, defaultAttributes } from '../../components/QuillEditor'
import { useColors } from '../../page_template/colors'
import { richTextAttributesSchema, RichTextDocument, richTextSegmentSchema } from '../../urban-stats-script/constants/rich-text'
import { TextBox } from '../../urban-stats-script/constants/text-box'
import { Property } from '../../utils/Property'
import { Edit } from '../../utils/array-edits'
import { BetterDatalist, cannotParse } from '../settings/BetterDatalist'
import { BetterSelector } from '../settings/BetterSelector'

import { EditInsetsHandles } from './InsetMap'

const toolbarHeight = '30px'

export function MapTextBoxComponent({ textBox: label, container, edit, i, count }: {
    textBox: TextBox
    container: RefObject<HTMLDivElement>
    edit?: Edit<TextBox>
    i: number
    count: number
}): ReactNode {
    const selectionProperty = useContext(SelectionContext)
    const selection = selectionProperty.use()

    const divRef = useRef<HTMLDivElement>(null)

    const colors = useColors()

    const refocus = (): void => {
        if (selection?.index === i) {
            quillRef.current!.focus()
        }
    }
    const quillRef = useRef<Quill>()

    const [format, setFormat] = useState(defaultAttributes)

    const updateFormat = useCallback(() => {
        const quill = quillRef.current!
        const currentSelection = quill.getSelection(false)
        if (currentSelection !== null) {
            const currentFormat = richTextAttributesSchema.parse(quill.getFormat(currentSelection.index, currentSelection.length))
            setFormat({ ...defaultAttributes, ...currentFormat })
        }
    }, [])

    useEffect(() => {
        const quill = quillRef.current!
        updateFormat()
        quill.on('editor-change', updateFormat)
        return () => {
            quill.off('editor-change', updateFormat)
        }
    }, [updateFormat])

    return (
        <div
            style={{ position: 'absolute',
                left: `${label.bottomLeft[0] * 100}%`,
                bottom: `${label.bottomLeft[1] * 100}%`,
                width: `${(label.topRight[0] - label.bottomLeft[0]) * 100}%`,
                height: `${(label.topRight[1] - label.bottomLeft[1]) * 100}%` }}
            ref={divRef}
        >
            {edit && (
                <div
                    style={{
                        position: 'absolute',
                        bottom: '100%',
                        backgroundColor: `${label.backgroundColor}aa`,
                        borderBottom: 0,
                        borderTop: `1px solid ${colors.borderShadow}`,
                        borderLeft: `1px solid ${colors.borderShadow}`,
                        borderRight: `1px solid ${colors.borderShadow}`,
                        borderRadius: '5px 5px 0 0',
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        padding: '5px',
                        flexWrap: 'wrap-reverse',
                        gap: '5px',
                        minWidth: 'fit-content',
                        minHeight: 'fit-content',
                        justifyContent: 'space-between',
                    }}
                >
                    <div style={{ display: 'flex' }}>
                        {/* Font Family Picker */}
                        <BetterSelector
                            iframe
                            value={format.font}
                            onChange={(fontFamily) => {
                                quillRef.current!.format('font', fontFamily, 'user')
                                updateFormat()
                            }}
                            possibleValues={['Jost', 'Times New Roman']}
                            renderValue={v => ({
                                text: v,
                                node: highlighted => (
                                    <div style={{
                                        fontFamily: v,
                                        padding: '8px 12px',
                                        backgroundColor: highlighted ? colors.slightlyDifferentBackgroundFocused : undefined,
                                        color: colors.textMain,
                                    }}
                                    >
                                        {v}
                                    </div>
                                ) })}
                            inputStyle={{ fontFamily: format.font, height: toolbarHeight, borderRadius: '4px 0 0 4px', borderRight: 'none' }}
                            disabled={selection?.index !== i}
                            onBlur={refocus}
                        />

                        {/* Font Size Picker */}
                        <BetterDatalist
                            iframe
                            value={format.size}
                            onChange={(fontSize) => {
                                quillRef.current!.format('size', `${fontSize}px`, 'user')
                                updateFormat()
                            }}
                            parse={(v) => {
                                const num = parseFloat(v)
                                if (isFinite(num)) {
                                    return num
                                }
                                return cannotParse
                            }}
                            possibleValues={[8, 10, 12, 14, 16, 20, 24, 36]}
                            renderValue={v => ({
                                text: v.toString(),
                                node: highlighted => (
                                    <div style={{
                                        fontSize: v,
                                        fontFamily: format.font,
                                        padding: '8px 12px',
                                        backgroundColor: highlighted ? colors.slightlyDifferentBackgroundFocused : undefined,
                                        color: colors.textMain,
                                    }}
                                    >
                                        {v}
                                    </div>
                                ) })}
                            inputStyle={{ fontFamily: format.font, height: toolbarHeight, borderRadius: '0 4px 4px 0' }}
                            disabled={selection?.index !== i}
                            onBlur={refocus}
                        />
                    </div>

                    <div style={{ display: 'flex' }}>
                        {([
                            { display: 'B', key: 'bold', style: { fontWeight: 'bold ' } },
                            { display: 'I', key: 'italic', style: { fontStyle: 'italic' } },
                            { display: 'U', key: 'underline', style: { textDecoration: 'underline' } },
                        ] as const).map(({ display, key, style }, buttonIndex, { length }) => {
                            return (
                                <button
                                    key={key}
                                    onClick={() => {
                                        quillRef.current!.format(key, !format[key], 'user')
                                        updateFormat()
                                        refocus()
                                    }}
                                    disabled={selection?.index !== i}
                                    style={{
                                        ...style,
                                        width: toolbarHeight,
                                        height: toolbarHeight,
                                        backgroundColor: format[key] ? colors.hueColors.blue : undefined,
                                        color: format[key] ? colors.buttonTextWhite : undefined,
                                        fontFamily: format.font,
                                        borderRadius: buttonIndex === 0 ? '5px 0 0 5px' : (buttonIndex === length - 1) ? '0 5px 5px 0' : 0,
                                        borderLeftWidth: buttonIndex > 0 ? 0 : undefined,
                                        fontSize: '18px',
                                    }}
                                >
                                    {display}
                                </button>
                            )
                        })}
                    </div>

                    {/* Color Picker */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                        <div style={{ color: colors.ordinalTextColor, fontSize: '14px' }}>Text</div>
                        <input
                            type="color"
                            value={Color(format.color).hex()}
                            onChange={(e) => {
                                quillRef.current!.format('color', Color(e.target.value).hex(), 'user')
                                updateFormat()
                            }}
                            disabled={selection?.index !== i}
                            onFocus={refocus}
                            style={{ height: toolbarHeight }}
                        />
                    </div>

                    <div style={{ display: 'flex' }}>
                        {([
                            '',
                            'center',
                            'right',
                            'justify',
                        ] as const).map((value, buttonIndex, { length }) => {
                            return (
                                <IconButton
                                    key={value}
                                    onClick={() => {
                                        quillRef.current!.format('align', value, 'user')
                                        updateFormat()
                                        refocus()
                                    }}
                                    disabled={selection?.index !== i}
                                    style={{
                                        backgroundColor: format.align === value ? colors.hueColors.blue : undefined,
                                        borderRadius: buttonIndex === 0 ? '5px 0 0 5px' : (buttonIndex === length - 1) ? '0 5px 5px 0' : 0,
                                        borderLeftWidth: buttonIndex > 0 ? 0 : undefined,
                                    }}
                                    icon={value}
                                    color={format.align === value ? colors.buttonTextWhite : colors.textMain}
                                />
                            )
                        })}
                    </div>

                    {/* Background Color Picker */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                        <div style={{ color: colors.ordinalTextColor, fontSize: '14px' }}>Background</div>
                        <input
                            type="color"
                            value={Color(label.backgroundColor).hex()}
                            onChange={(e) => {
                                edit.modify({ backgroundColor: Color(e.target.value).hex() })
                            }}
                            style={{ height: toolbarHeight }}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '2px' }}>
                        {/* Formula */}
                        <IconButton
                            onClick={() => {
                                if (selection?.index === i) {
                                    const formula = prompt('Enter formula')
                                    if (formula) {
                                        quillRef.current!.updateContents(new Delta().retain(selection.range.index).delete(selection.range.length).insert({ formula }), 'user')
                                        quillRef.current!.setSelection(selection.range.index + 1, 'user')
                                    }
                                }
                            }}
                            disabled={selection?.index !== i}
                            icon="function"
                            color={colors.textMain}
                        />

                        {/* File */}
                        <IconButton
                            onClick={() => {
                                if (selection?.index === i) {
                                    const image = prompt('Enter image URL')
                                    if (image) {
                                        quillRef.current!.updateContents(new Delta().retain(selection.range.index).delete(selection.range.length).insert({ image }), 'user')
                                        quillRef.current!.setSelection(selection.range.index + 1, 'user')
                                    }
                                }
                            }}
                            disabled={selection?.index !== i}
                            icon="image"
                            color={colors.textMain}
                        />
                    </div>

                    {/* Border */}
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <div style={{ color: colors.ordinalTextColor, fontSize: '14px' }}>Border</div>
                        <div style={{ width: '2px' }} />
                        <BetterDatalist
                            iframe
                            value={label.borderWidth}
                            onChange={(borderWidth) => {
                                edit.modify({ borderWidth })
                            }}
                            parse={(v) => {
                                const num = parseFloat(v)
                                if (isFinite(num)) {
                                    return num
                                }
                                return cannotParse
                            }}
                            possibleValues={[0, 1, 2, 3, 4, 5]}
                            renderValue={v => ({
                                text: v.toString(),
                            })}
                            inputStyle={{ borderRadius: '4px 0 0 4px', height: toolbarHeight }}
                        />
                        <input
                            type="color"
                            value={Color(label.borderColor).hex()}
                            onChange={(e) => {
                                edit.modify({ borderColor: Color(e.target.value).hex() })
                            }}
                            style={{ height: toolbarHeight, borderRadius: '0 4px 4px 0', borderLeft: 'none' }}
                        />
                    </div>
                </div>
            )}
            <QuillEditor
                quillRef={quillRef}
                editable={!!edit}
                content={toQuillDelta(label.text)}
                onTextChange={(delta) => {
                    edit!.modify({ text: fromQuillDelta(delta) })
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
            />
            { edit && (
                <EditInsetsHandles
                    frame={[...label.bottomLeft, ...label.topRight]}
                    setFrame={(newFrame) => {
                        edit.modify({ bottomLeft: [newFrame[0], newFrame[1]], topRight: [newFrame[2], newFrame[3]] })
                    }}
                    container={container}
                    delete={edit.delete}
                    duplicate={edit.duplicate}
                    add={undefined}
                    shouldHaveCenterHandle={true}
                    moveUp={i + 1 < count ? () => { edit.moveUp() } : undefined}
                    moveDown={i > 0 ? () => { edit.moveDown() } : undefined}
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

const fontAttributor = Quill.import('attributors/style/font') as Parchment.Attributor
fontAttributor.whitelist = undefined
Quill.register(fontAttributor, true)

const sizeAttributor = Quill.import('attributors/style/size') as Parchment.Attributor
sizeAttributor.whitelist = undefined
Quill.register(sizeAttributor, true)

// From https://fonts.google.com/icons
const paths = {
    '': <path d="M120-120v-80h720v80H120Zm0-160v-80h480v80H120Zm0-160v-80h720v80H120Zm0-160v-80h480v80H120Zm0-160v-80h720v80H120Z" />,
    'center': <path d="M120-120v-80h720v80H120Zm160-160v-80h400v80H280ZM120-440v-80h720v80H120Zm160-160v-80h400v80H280ZM120-760v-80h720v80H120Z" />,
    'right': <path d="M120-760v-80h720v80H120Zm240 160v-80h480v80H360ZM120-440v-80h720v80H120Zm240 160v-80h480v80H360ZM120-120v-80h720v80H120Z" />,
    'justify': <path d="M120-120v-80h720v80H120Zm0-160v-80h720v80H120Zm0-160v-80h720v80H120Zm0-160v-80h720v80H120Zm0-160v-80h720v80H120Z" />,
    'function': <path d="M400-240v-80h62l105-120-105-120h-66l-64 344q-8 45-37 70.5T221-120q-45 0-73-24t-28-64q0-32 17-51.5t43-19.5q25 0 42.5 17t17.5 41q0 5-.5 9t-1.5 9q5-1 8.5-5.5T252-221l62-339H200v-80h129l21-114q7-38 37.5-62t72.5-24q44 0 72 26t28 65q0 30-17 49.5T500-680q-25 0-42.5-17T440-739q0-5 .5-9t1.5-9q-6 2-9 6t-5 12l-17 99h189v80h-32l52 59 52-59h-32v-80h200v80h-62L673-440l105 120h62v80H640v-80h32l-52-60-52 60h32v80H400Z" />,
    'image': <path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm0-80h560v-560H200v560Zm40-80h480L570-480 450-320l-90-120-120 160Zm-40 80v-560 560Z" />,
} as const

function IconButton(props: React.DetailedHTMLProps<React.ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement> & { icon: keyof typeof paths, color: string }): ReactNode {
    return (
        <button
            {...props}
            style={{
                width: toolbarHeight,
                height: toolbarHeight,
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                ...props.style,
            }}
        >
            <svg xmlns="http://www.w3.org/2000/svg" height="18px" viewBox="0 -960 960 960" width="18px" fill={props.color}>
                {paths[props.icon]}
            </svg>
        </button>
    )
}

export function toQuillDelta(text: RichTextDocument): Delta {
    const result = new Delta(text.map(segment => ({
        ...segment,
        attributes: segment.attributes && {
            ...segment.attributes,
            size: segment.attributes.size && `${segment.attributes.size}px`,
        },
    })))
    return result
}

export function fromQuillDelta(delta: Delta): RichTextDocument {
    return delta.ops.flatMap((op) => {
        const { success, data } = richTextSegmentSchema.safeParse(op)
        if (!success) {
            console.warn(`Couldn't parse Quill Op ${JSON.stringify(op)}`)
            return []
        }
        const droppedAttributes = Object.entries(op.attributes ?? {}).filter(
            ([key]) => !(key in (data.attributes ?? {})),
        )
        if (droppedAttributes.length > 0) {
            console.warn(`Dropped attributes: ${droppedAttributes.join(', ')}`)
        }
        return [data]
    })
}
