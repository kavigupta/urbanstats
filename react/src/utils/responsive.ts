import { useEffect, useState } from "react";

export function useResponsive() {
    const [innerWidth, setInnerWidth] = useState(window.innerWidth);

    useEffect(() => {
        const observer = () => setInnerWidth(window.innerWidth)
        window.addEventListener('resize', observer)
        return () => window.removeEventListener('resize', observer)
    })

    return new Responsive(innerWidth <= 1100);
}

class Responsive {
    constructor(readonly mobileLayout: boolean) {}

    get headerTextClass() {
        return "centered_text " + (this.mobileLayout ? "headertext_mobile" : "headertext")
    }   

    get subHeaderTextClass() {
        return "centered_text " + (this.mobileLayout ? "subheadertext_mobile" : "subheadertext")
    }

    comparisonHeadStyle(align = "center") {
        // bold
        return {
            fontSize: this.mobileLayout ? "15px" : "20px",
            fontWeight: "bold",
            margin: "0",
            padding: "0",
            textAlign: align,
            verticalAlign: "bottom",
            color: "#000000",
        }
    }
}
