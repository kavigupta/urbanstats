
export {headerTextClass, subHeaderTextClass, mobileLayout}

function mobileLayout() {
    return window.innerWidth <= 1100;
}

function headerTextClass() {
    return "centered_text " + (mobileLayout() ? "headertext_mobile" : "headertext")
}

function subHeaderTextClass() {
    return "centered_text " + (mobileLayout() ? "subheadertext_mobile" : "subheadertext");
}