
export { headerTextClass, subHeaderTextClass, mobileLayout, comparisonHeadStyle }

function mobileLayout() {
    return window.innerWidth <= 1100;
}

function headerTextClass() {
    return "centered_text " + (mobileLayout() ? "headertext_mobile" : "headertext")
}

function subHeaderTextClass() {
    return "centered_text " + (mobileLayout() ? "subheadertext_mobile" : "subheadertext");
}

function comparisonHeadStyle(
    align = "center"
) {
    // bold
    return {
        fontSize: mobileLayout() ? "15px" : "20px",
        fontWeight: 500,
        margin: "0",
        padding: "0",
        textAlign: align,
        verticalAlign: "bottom",
        color: "#000000",
    }
}