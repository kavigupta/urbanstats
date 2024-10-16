import React, { ReactNode } from 'react'

import { useColors } from '../page_template/colors'
import { interpolate_color } from '../utils/color'

import { ColorMap, EncodedColorMap, RAMPS, RampDescriptor, parse_custom_colormap } from './ramps'
import { useSettingSubNameStyle } from './style'

export function RampColormapSelector(props: { ramp: RampDescriptor, set_ramp: (newValue: RampDescriptor) => void, name?: string }): ReactNode {
    // dropdown selector for either a custom ramp or a ramp from a list of presets
    // if custom ramp, then add a text box for the ramp

    const colors = useColors()

    const colormap = props.ramp.colormap

    const set_colormap = (encodedColormap: EncodedColorMap): void => {
        props.set_ramp({
            ...props.ramp,
            colormap: encodedColormap,
        })
    }

    const set_selected = (name: string): void => {
        if (name === 'Custom') {
            colormap.type = 'custom'
        }
        else {
            colormap.type = 'preset';
            (colormap as { name: string }).name = name
        }
        set_colormap(colormap)
    }

    const set_custom_colormap = (custom_colormap: string): void => {
        set_colormap({
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
                onChange={(e) => { set_selected(e.target.value) }}
                style={{ width: '100%', backgroundColor: colors.background }}
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
                                    set_colormap={(custom_colormap) => { set_custom_colormap(custom_colormap) }}
                                />
                            </span>
                        )
                    : <div></div>
            }
        </div>
    )
}

function SinglePointSelector({ value, color, cell, set_cell, remove_cell }: { value: number, color: string, cell: [number, string], set_cell: (newValue: [number, string]) => void, remove_cell: () => void }): ReactNode {
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
                    set_cell([
                        cell[0],
                        e.target.value,
                    ])
                }}
                style={{ backgroundColor: colors.background }}
            />
            <input
                type="number"
                value={value}
                style={{ width: '4em', backgroundColor: colors.background }}
                onChange={(e) => {
                    set_cell([
                        parseFloat(e.target.value),
                        cell[1],
                    ])
                }}
            />
            <button
                onClick={() => { remove_cell() }}
            >
                -
            </button>
        </div>
    )
}

function CustomColormapSelector(props: { colormap: string, set_colormap: (newValue: string) => void }): ReactNode {
    // flexbox containing several color tabs
    // each color tab is a vertical flexbox containing a color picker and a text box
    // at the end there is a plus button to add a new color tab
    // each color tab has a minus button to remove itself
    const colors = useColors()
    let colormap_text = props.colormap
    const parsed_colormap = parse_custom_colormap(colormap_text)
    let colormap: ColorMap
    if (parsed_colormap !== undefined) {
        colormap = parsed_colormap.sort((a, b) => a[0] - b[0])
        colormap_text = JSON.stringify(colormap)
    }
    else {
        colormap = []
    }
    // colormap :: [[number, string]]

    const add_cell = (at_index: number): void => {
        const new_colormap = colormap.slice()
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
        const color = interpolate_color(colormap, value)
        new_colormap.splice(at_index, 0, [value, color])
        props.set_colormap(
            JSON.stringify(new_colormap),
        )
    }

    function AddCellButton({ at_index }: { at_index: number }): ReactNode {
        return (
            <button
                onClick={() => { add_cell(at_index) }}
            >
                +
            </button>
        )
    }

    const color_tabs = (
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
            <AddCellButton at_index={0} key={-1} />
            {
                colormap.flatMap(([value, color], i) => [
                    <SinglePointSelector
                        key={2 * i}
                        value={value}
                        color={color}
                        cell={colormap[i]}
                        set_cell={(cell) => {
                            const new_colormap = colormap.slice()
                            new_colormap[i] = cell
                            props.set_colormap(
                                JSON.stringify(new_colormap),
                            )
                        }}
                        remove_cell={() => {
                            const new_colormap = colormap.slice()
                            new_colormap.splice(i, 1)
                            props.set_colormap(
                                JSON.stringify(new_colormap),
                            )
                        }}
                    />,
                    <AddCellButton key={2 * i + 1} at_index={i + 1} />,
                ])
            }

        </div>
    )
    // then an input textbox
    const input_textbox = (
        <input
            type="text"
            style={{ width: '100%', backgroundColor: colors.background }}
            placeholder='Custom map, e.g., [[0, "#ff0000"], [1, "#0000ff"]]'
            value={colormap_text}
            onChange={(e) => { props.set_colormap(e.target.value) }}
        />
    )
    return (
        <div>
            <div style={useSettingSubNameStyle()}>
                Custom Colormap
            </div>
            {color_tabs}
            {input_textbox}
        </div>
    )
}
