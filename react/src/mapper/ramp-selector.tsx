import React, { ReactNode } from 'react'

import { useColors } from '../page_template/colors'
import { interpolateColor } from '../utils/color'

import { ColorMap, EncodedColorMap, RAMPS, RampDescriptor, parseCustomColormap } from './ramps'
import { useSettingSubNameStyle } from './style'

export function RampColormapSelector(props: { ramp: RampDescriptor, setRamp: (newValue: RampDescriptor) => void, name?: string }): ReactNode {
    // dropdown selector for either a custom ramp or a ramp from a list of presets
    // if custom ramp, then add a text box for the ramp

    const colors = useColors()

    const colormap = props.ramp.colormap

    const setColormap = (encodedColormap: EncodedColorMap): void => {
        props.setRamp({
            ...props.ramp,
            colormap: encodedColormap,
        })
    }

    const setSelected = (name: string): void => {
        if (name === 'Custom') {
            colormap.type = 'custom'
        }
        else {
            colormap.type = 'preset';
            (colormap as { name: string }).name = name
        }
        setColormap(colormap)
    }

    const setCustomColormap = (custom_colormap: string): void => {
        setColormap({
            ...colormap,
            type: 'custom',
            custom_colormap,
        })
    }

    const options = [
        '',
        'Custom',
        ...Object.keys(RAMPS),
    ]

    let colormapSelection: string
    if (colormap.type === 'none') {
        colormapSelection = ''
    }
    else if (colormap.type === 'preset') {
        colormapSelection = colormap.name
    }
    else {
        colormapSelection = 'Custom'
    }

    return (
        <div>
            <div style={useSettingSubNameStyle()}>
                {props.name}
            </div>
            <select
                onChange={(e) => { setSelected(e.target.value) }}
                style={{ width: '100%', backgroundColor: colors.background, color: colors.textMain }}
                value={colormapSelection}
            >
                {
                    options.map((name, i) => (
                        <option key={i} value={name}>{name}</option>
                    ))
                }
            </select>
            {
                colormap.type === 'custom'
                    ? (
                            <span>
                                <CustomColormapSelector
                                    colormap={colormap.custom_colormap}
                                    setColormap={(custom_colormap) => { setCustomColormap(custom_colormap) }}
                                />
                            </span>
                        )
                    : <div></div>
            }
        </div>
    )
}

function SinglePointSelector({ value, color, cell, setCell, removeCell }: { value: number, color: string, cell: [number, string], setCell: (newValue: [number, string]) => void, removeCell: () => void }): ReactNode {
    const colors = useColors()
    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                alignContent: 'center',
                margin: '0.25em',
            }}
        >
            <input
                type="color"
                value={color}
                onChange={(e) => {
                    setCell([
                        cell[0],
                        e.target.value,
                    ])
                }}
                style={{ backgroundColor: colors.background, color: colors.textMain }}
            />
            <input
                type="number"
                value={value}
                style={{ width: '4em', backgroundColor: colors.background, color: colors.textMain }}
                onChange={(e) => {
                    setCell([
                        parseFloat(e.target.value),
                        cell[1],
                    ])
                }}
            />
            <button
                onClick={() => { removeCell() }}
            >
                -
            </button>
        </div>
    )
}

function CustomColormapSelector(props: { colormap: string, setColormap: (newValue: string) => void }): ReactNode {
    // flexbox containing several color tabs
    // each color tab is a vertical flexbox containing a color picker and a text box
    // at the end there is a plus button to add a new color tab
    // each color tab has a minus button to remove itself
    const colors = useColors()
    let colormapText = props.colormap
    const parsedColormap = parseCustomColormap(colormapText)
    let colormap: ColorMap
    if (parsedColormap !== undefined) {
        colormap = parsedColormap.sort((a, b) => a[0] - b[0])
        colormapText = JSON.stringify(colormap)
    }
    else {
        colormap = []
    }
    // colormap :: [[number, string]]

    const addCell = (at_index: number): void => {
        const newColormap = colormap.slice()
        let value = 0
        if (at_index === 0) {
            value = colormap[0][0] - 1
        }
        else if (at_index === colormap.length) {
            value = colormap[colormap.length - 1][0] + 1
        }
        else {
            value = (colormap[at_index - 1][0] + colormap[at_index][0]) / 2
        }
        const color = interpolateColor(colormap, value)
        newColormap.splice(at_index, 0, [value, color])
        props.setColormap(
            JSON.stringify(newColormap),
        )
    }

    function AddCellButton({ atIndex }: { atIndex: number }): ReactNode {
        return (
            <button
                onClick={() => { addCell(atIndex) }}
            >
                +
            </button>
        )
    }

    const colorTabs = (
        <div
            style={{
                display: 'flex',
                flexDirection: 'row',
                flexWrap: 'wrap',
                justifyContent: 'flex-start',
                alignItems: 'center',
                alignContent: 'flex-start',
            }}
        >
            <AddCellButton atIndex={0} key={-1} />
            {
                colormap.flatMap(([value, color], i) => [
                    <SinglePointSelector
                        key={2 * i}
                        value={value}
                        color={color}
                        cell={colormap[i]}
                        setCell={(cell) => {
                            const newColormap = colormap.slice()
                            newColormap[i] = cell
                            props.setColormap(
                                JSON.stringify(newColormap),
                            )
                        }}
                        removeCell={() => {
                            const newColormap = colormap.slice()
                            newColormap.splice(i, 1)
                            props.setColormap(
                                JSON.stringify(newColormap),
                            )
                        }}
                    />,
                    <AddCellButton key={2 * i + 1} atIndex={i + 1} />,
                ])
            }

        </div>
    )
    // then an input textbox
    const inputTextbox = (
        <input
            type="text"
            style={{ width: '100%', backgroundColor: colors.background, color: colors.textMain }}
            placeholder='Custom map, e.g., [[0, "#ff0000"], [1, "#0000ff"]]'
            value={colormapText}
            onChange={(e) => { props.setColormap(e.target.value) }}
        />
    )
    return (
        <div>
            <div style={useSettingSubNameStyle()}>
                Custom Colormap
            </div>
            {colorTabs}
            {inputTextbox}
        </div>
    )
}
