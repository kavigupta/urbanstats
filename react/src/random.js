import "./style.css";
import "./common.css";

import { by_population, uniform } from './navigation/random.js';
import { load_settings } from './page_template/settings.js';


async function main() {
    const window_info = new URLSearchParams(window.location.search);

    const [settings, _] = load_settings();

    console.log(settings);

    const sampleby = window_info.get("sampleby");

    console.log(sampleby);
    if (sampleby == "uniform" || sampleby === null) {
        uniform(settings);
    } else if (sampleby == "population") {
        by_population(settings, window_info.get("us_only").toLowerCase() == "true");
    }
}

main();