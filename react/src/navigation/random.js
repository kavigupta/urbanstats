export { uniform, by_population };
import "../style.css";
import "../common.css";
import { article_link } from '../navigation/links';

import { loadJSON, loadProtobuf } from '../load_json.js';
import { is_historical_cd } from "../utils/is_historical";


async function by_population(settings, domestic_only=false) {
    let values = (await loadProtobuf("/index/pages.gz", "StringList")).elements;
    let populations = loadJSON("/index/best_population_estimate.json");
    var totalWeight = populations.reduce(function (sum, x) {
        return sum + x;
    }, 0);

    while (true) {
        // Generate a random number between 0 and the total weight
        var randomValue = Math.random() * totalWeight;

        // Find the destination based on the random value
        var x = null;
        var cumulativeWeight = 0;

        for (var i = 0; i < values.length; i++) {
            cumulativeWeight += populations[i];

            if (randomValue < cumulativeWeight) {
                x = values[i];
                break;
            }
        }

        if (!settings.show_historical_cds && is_historical_cd(x)) {
            continue;
        }

        if (domestic_only && !x.endsWith(", USA")) {
            continue;
        }

        document.location = article_link(x);
        break;
    }
}

async function uniform(settings) {
    let values = (await loadProtobuf("/index/pages.gz", "StringList")).elements;
    while (true) {
        var randomIndex = Math.floor(Math.random() * values.length);
        let x = values[randomIndex];
        if (!settings.show_historical_cds && is_historical_cd(x)) {
            continue;
        }
        document.location = article_link(x);
        break;
    }
}