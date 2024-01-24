export { ScreenshotButton, create_screenshot };

import React from 'react';
import domtoimage from 'dom-to-image';


class ScreenshotButton extends React.Component {
    constructor(props) {
        super(props);
        // props contains
        // screenshot_mode :: bool
        // onClick :: () -> ()
    }

    render() {
        // shadow around the image to make it look like a button
        const screencap_button = <div
            onClick={this.props.onClick}
            style={{
                height: "100%",
                aspectRatio: "1/1",
                boxShadow: "0px 0px 10px 0px rgba(0,0,0,0.75)",
                cursor: "pointer",
            }}
        >
            <img src="/screenshot.png" alt="Screenshot Button" style={{ height: "100%", aspectRatio: "1/1" }} />
        </div>
        // if screenshot mode is on, put a loading circle over the image
        if (this.props.screenshot_mode) {
            const pad = 10; // pct
            const loading_circle = <div style={{
                position: "absolute",
                height: (100 - 2 * pad) + "%",
                width: (100 - 2 * pad) + "%",
                top: pad + "%",
                left: pad + "%",
                borderRadius: "50%",
                border: "5px solid #fff",
                borderTop: "5px solid #000",
                animation: "spin 2s linear infinite",
                zIndex: 2,
                animationPlayState: "running",
            }}></div>
            const dim_filter = <div style={{
                position: "absolute",
                height: "100%",
                width: "100%",
                top: 0,
                left: 0,
                backgroundColor: "rgba(0,0,0,0.5)",
                zIndex: 1,
            }}></div>
            return <div style={{ position: "relative", height: "100%", aspectRatio: "1/1" }}>
                {screencap_button}
                {dim_filter}
                {loading_circle}
            </div>
        }
        return screencap_button;
    }
}

async function create_screenshot(config) {
    const overall_width = config.overall_width;

    async function screencap_element(ref) {
        const scale_factor = overall_width / ref.offsetWidth;
        const link = await domtoimage.toPng(ref, {
            bgcolor: "white",
            height: ref.offsetHeight * scale_factor,
            width: ref.offsetWidth * scale_factor,
            style: {
                transform: "scale(" + scale_factor + ")",
                transformOrigin: "top left"
            }
        });
        return [link, scale_factor * ref.offsetHeight]
    }

    const png_links = [];
    const heights = [];
    for (const ref of config.elements_to_render) {
        const [png_link, height] = await screencap_element(ref);
        png_links.push(png_link);
        heights.push(height);
    }

    const canvas = document.createElement("canvas");

    const pad_around = 100;
    const pad_between = 50;

    canvas.width = pad_around * 2 + overall_width;
    canvas.height = pad_around * 2 + pad_between * (png_links.length - 1) + heights.reduce((a, b) => a + b, 0);

    const ctx = canvas.getContext("2d");
    const imgs = [];
    for (const png_link of png_links) {
        const img = new Image();
        img.src = png_link;
        imgs.push(img);
    }
    // flood the canvas with white
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (const img of imgs) {
        await new Promise((resolve, reject) => {
            img.onload = () => resolve();
        })
    }
    var start = pad_around;
    for (const img of imgs) {
        ctx.drawImage(img, pad_around, start);
        start += img.height + pad_between;
    }

    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = config.path;
    a.click();
}