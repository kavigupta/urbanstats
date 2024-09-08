export function mobileLayout(): boolean {
    return window.innerWidth <= 1100
}

export function headerTextClass(): string {
    return `centered_text ${mobileLayout() ? 'headertext_mobile' : 'headertext'}`
}

export function subHeaderTextClass(): string {
    return `centered_text ${mobileLayout() ? 'subheadertext_mobile' : 'subheadertext'}`
}

export function comparisonHeadStyle(
    align: React.CSSProperties['textAlign'] = 'center',
): React.CSSProperties {
    // bold
    return {
        fontSize: mobileLayout() ? '15px' : '20px',
        fontWeight: 500,
        margin: '0',
        padding: '0',
        textAlign: align,
        verticalAlign: 'bottom',
        color: '#000000',
    }
}
