import { useColors } from '../page_template/colors'

export const setting_name_style = {
    fontWeight: 500,
    fontSize: '1.2em',
    marginBottom: '0.125em',
}

export const useSettingSubNameStyle = (): React.CSSProperties => ({
    fontWeight: 500,
    fontSize: '1em',
    marginBottom: '0.125em',
    color: useColors().ordinalTextColor,
})
