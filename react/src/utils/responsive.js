
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

function comparisonHeadStyle() {
    // bold
    return {
        fontSize: mobileLayout() ? "15px" : "20px",
        fontWeight: "bold",
        margin: "0",
        padding: "0",
        textAlign: "center",
        verticalAlign: "bottom",
    }
}