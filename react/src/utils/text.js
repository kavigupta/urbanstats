import { universe_is_american } from "../universe";

export { display_type };

const american_to_international = require("..//data/american_to_international.json");

function display_type(universe, type) {
    const american_to_international_reversed = Object.fromEntries(Object.entries(american_to_international).map(([a, b]) => [b, a]));
    if (type in american_to_international_reversed && universe_is_american(universe)) {
        type = american_to_international_reversed[type];
    }
    if (type.endsWith("y")) {
        return type.slice(0, -1) + "ies";
    }
    return type + "s";
}