import { loadJSON } from '../load_json';

export { sampleQuiz };

var PRNG = require('prng');


function sample_without_replacement(arr, n, rng) {
    // https://stackoverflow.com/a/19270021
    if (n > arr.length) {
        throw "n > arr.length";
    }
    let result = [];
    while (result.length < n) {
        let index = rng.rand(arr.length - 1);
        if (!result.includes(arr[index])) {
            result.push(arr[index]);
        }
    }
    return result;
}

function sampleQuiz(num_questions, seed) {
    const rng = new PRNG(seed);
    const ALL_CATEGORIES = require("../data/quiz/categories.json");
    const ALL_TYPES = require("../data/quiz/types.json");
    let categories = sample_without_replacement(ALL_CATEGORIES, num_questions, rng);
    let types = sample_without_replacement(ALL_TYPES, num_questions, rng);
    console.log(categories);
    console.log(types);

    return categories.map((category, i) => sampleQuestion(category, types[i], rng));
}

function sampleQuestion(category, type, rng) {
    //     {
    //         "stat_column": "Household Income > $100k %",
    //         "question": "higher % of people who have household income > $100k",
    //         "longname_a": "McKinney-Frisco [Urban Area], TX, USA",
    //         "longname_b": "Dayton [Urban Area], OH, USA",
    //         "stat_a": 0.5909875439201685,
    //         "stat_b": 0.27804659986551167,
    //     }
    const CATEGORY_TO_STATS = require("../data/quiz/category_to_stats.json");
    const STAT_TO_QUESTION = require("../data/quiz/stat_to_question.json");
    const LIST_OF_REGIONS = require("../data/quiz/list_of_regions.json");
    while (true) {
        const stat_column = sample_without_replacement(CATEGORY_TO_STATS[category], 1, rng)[0];
        const region_a = sample_without_replacement(LIST_OF_REGIONS[type], 1, rng)[0];
        const region_b = sample_without_replacement(LIST_OF_REGIONS[type], 1, rng)[0];
        const question = STAT_TO_QUESTION[stat_column];

        const stat_a = loadJSON(`/quiz_sample_info/${sharded_name(region_a)}.json`)[stat_column];
        const stat_b = loadJSON(`/quiz_sample_info/${sharded_name(region_b)}.json`)[stat_column];

        if (stat_a > stat_b && (stat_a - stat_b) / stat_a < 0.05) {
            continue
        }

        if (stat_b > stat_a && (stat_b - stat_a) / stat_b < 0.05) {
            continue
        }

        return {
            stat_column: stat_column,
            question: question,
            longname_a: region_a,
            longname_b: region_b,
            stat_a: stat_a,
            stat_b: stat_b,
        }
    }
}