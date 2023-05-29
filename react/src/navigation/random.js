export { uniform, by_population };
import "../style.css";
import "../common.css";
import { article_link } from '../navigation/links';

import { loadJSON } from '../load_json.js';


function by_population() {
    let values = loadJSON("/index/pages.json");
    let populations = loadJSON("/index/population.json");
    var totalWeight = populations.reduce(function (sum, x) {
        return sum + x;
    }, 0);

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

    document.location = article_link(x);
}

function uniform() {
    let values = loadJSON("/index/pages.json");
    var randomIndex = Math.floor(Math.random() * values.length);
    let x = values[randomIndex];
    document.location = article_link(x);
}