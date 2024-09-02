
import { Selector, ClientFunction } from 'testcafe';

const fs = require('fs');
const path = require('path');


export const TARGET = process.env.URBANSTATS_TEST_TARGET ?? "http://localhost:8000"
export const SEARCH_FIELD = Selector('input').withAttribute('placeholder', 'Search Urban Stats');
export const getLocation = ClientFunction(() => document.location.href);

export const IS_TESTING = true;

export function comparison_page(locations) {
    const params = new URLSearchParams();
    params.set('longnames', JSON.stringify(locations));
    return TARGET + '/comparison.html?' + params.toString();
}

export async function check_textboxes(t, txts) {
    const hamburgerMenu = Selector('div').withAttribute('class', 'hamburgermenu');
    if (await hamburgerMenu.exists) {
        await t.click(hamburgerMenu);
    }
    for (const txt of txts) {
        const checkbox = Selector('div').withAttribute('class', 'checkbox-setting')
            // filter for label
            .filter(node => node.querySelector('label').innerText === txt, { txt })
            // find checkbox
            .find('input');
        await t.click(checkbox);
    }
    if (await hamburgerMenu.exists) {
        await t.click(hamburgerMenu);
    }
}

export async function check_all_category_boxes(t) {
    const hamburgerMenu = Selector('div').withAttribute('class', 'hamburgermenu');
    if (await hamburgerMenu.exists) {
        await t.click(hamburgerMenu);
    }
    const checkboxes = Selector('div').withAttribute('class', 'checkbox-setting')
        .filter(node => {
            const label = node.querySelector('label').innerText;
            return (
                label !== "Use Imperial Units"
                && label !== "Include Historical Districts"
                && label !== "Simple Ordinals"
                && label !== "Race"
                && label !== "Election"
            );
        }).find('input');
    for (let i = 0; i < await checkboxes.count; i++) {
        await t.click(checkboxes.nth(i));
    }
    if (await hamburgerMenu.exists) {
        await t.click(hamburgerMenu);
    }
    // reload
    await t.eval(() => location.reload(true));
}


async function prep_for_image(t) {
    await t.wait(1000);
    await t.eval(() => {
        // disable the leaflet map
        for (const x of document.getElementsByClassName("leaflet-tile-pane")) {
            x.remove();
        }
        for (const x of document.getElementsByClassName("map-container-for-testing")) {
            const style = "border-style: solid; border-color: #abcdef";
            x.setAttribute("style", style);
        }
        document.getElementById("current-version").innerHTML = "&lt;VERSION&gt;";
        document.getElementById("last-updated").innerHTML = "&lt;LAST UPDATED&gt;";
        for (const x of document.getElementsByClassName("juxtastat-user-id")) {
            x.innerHTML = "&lt;USER ID&gt;";
        }
    });
}

export async function screencap(t, name) {
    await prep_for_image(t)
    return await t.takeScreenshot({
        // include the browser name in the screenshot path
        path: name + '_' + t.browser.name + '.png',
        fullPage: true,
        thumbnails: false
    })
}

export async function grab_download(t, name, button) {
    await prep_for_image(t);
    await t
        .click(button);
    await t.wait(3000);
    await copy_most_recent_file(t, name);
}

export async function download_image(t, name) {
    const download = Selector('img').withAttribute('src', '/screenshot.png');
    await grab_download(t, name, download);
}

export async function download_histogram(t, name, nth) {
    const download = Selector('img').withAttribute('src', '/download.png').nth(nth);
    await grab_download(t, name, download);
}

export function most_recent_download_path() {
    // get the most recent file in the downloads folder
    const downloadsFolder = require('downloads-folder');
    const files = fs.readdirSync(downloadsFolder());
    const sorted = files.map(x => path.join(downloadsFolder(), x)).sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);

    console.log("Most recent download: " + sorted[0]);
    return sorted[0];
}

async function copy_most_recent_file(t, name) {
    // copy the file to the screenshots folder
    const screenshotsFolder = path.join(__dirname, '..', 'screenshots');
    fs.copyFileSync(most_recent_download_path(), path.join(screenshotsFolder, name + '_' + t.browser.name + '.png'));
}

export async function download_or_check_string(t, string, name) {
    const path_to_file = path.join(__dirname, '..', "..", "tests", 'reference_strings', name + '.txt');
    if (IS_TESTING) {
        const expected = fs.readFileSync(path_to_file, 'utf8');
        await t.expect(string).eql(expected);
    } else {
        fs.writeFileSync(path_to_file, string);
    }
}
