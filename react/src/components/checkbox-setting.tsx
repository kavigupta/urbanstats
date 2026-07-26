import React, { CSSProperties, ReactNode, useEffect, useId, useRef } from 'react'

import { useColors } from '../page_template/colors'
import { SettingsDictionary, useSetting, useSettingInfo } from '../page_template/settings'

/**
 * The checkbox controls, which started out in the sidebar but are used all over: the
 * mapper's editors, the quiz, the histogram, the statistic tree.
 */

// type representing a key of SettingsDictionary that have boolean values
export type BooleanSettingKey = keyof { [K in keyof SettingsDictionary as SettingsDictionary[K] extends boolean | undefined ? K : never]: boolean }

export function CheckboxSetting(props: { name: string, settingKey: BooleanSettingKey, classNameToUse?: string, id?: string, testId?: string, forcedOn?: boolean, fontSize?: string }): ReactNode {
    const [checked, setChecked] = useSetting(props.settingKey)
    const info = useSettingInfo(props.settingKey)

    return (
        <CheckboxSettingCustom
            name={props.name}
            checked={(checked ?? false) || (props.forcedOn ?? false)}
            forcedOn={props.forcedOn}
            onChange={setChecked}
            classNameToUse={props.classNameToUse}
            id={props.id}
            testId={props.testId}
            highlight={'stagedValue' in info && info.stagedValue !== info.persistedValue}
            fontSize={props.fontSize}
        />
    )
};

export interface CheckboxSettingCustomJustInputProps {
    checked: boolean
    onChange: (checked: boolean) => void
    indeterminate?: boolean
    id?: string
    testId?: string
    highlight?: boolean
    forcedOn?: boolean
    style?: CSSProperties
    fontSize?: string
}

const defaultFontSize = '16px'

type CheckboxSettingCustomProps = CheckboxSettingCustomJustInputProps & {
    name: string
    classNameToUse?: string
}

export function CheckboxSettingCustom(props: CheckboxSettingCustomProps): ReactNode {
    const colors = useColors()

    const divStyle: CSSProperties = {
        backgroundColor: props.highlight ? colors.slightlyDifferentBackgroundFocused : undefined,
        borderRadius: '5px',
        display: 'flex',
        alignItems: 'top',
        ...props.style,
    }
    const id = useId()
    const inputId = props.id ?? id

    return (
        <div className={(props.classNameToUse ?? 'checkbox-setting') + (props.forcedOn ? ' testing-checkbox-disabled' : '')} style={divStyle}>
            <CheckboxSettingJustBox
                {...props}
                id={inputId}
                style={{ ...props.style }}
            />
            <label htmlFor={inputId} style={{ fontSize: props.fontSize ?? defaultFontSize }}>{props.name}</label>
        </div>
    )
};

export function CheckboxSettingJustBox(props: CheckboxSettingCustomJustInputProps): ReactNode {
    const colors = useColors()
    const id = useId()
    const checkboxRef = useRef<HTMLInputElement>(null)
    const inputId = props.id ?? id
    const forcedOn = props.forcedOn ?? false

    useEffect(() => {
        checkboxRef.current!.indeterminate = props.indeterminate ?? false
    }, [props.indeterminate])

    return (
        <input
            id={inputId}
            type="checkbox"
            checked={props.checked}
            disabled={forcedOn}
            onChange={(e) => { props.onChange(e.target.checked) }}
            ref={checkboxRef}
            style={{ accentColor: colors.hueColors.blue, backgroundColor: colors.background, ...props.style, height: props.fontSize ?? defaultFontSize }}
            data-test-id={props.testId}
            data-test-highlight={props.highlight}
        />
    )
}
