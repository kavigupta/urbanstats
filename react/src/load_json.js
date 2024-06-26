export { loadJSON, loadProtobuf, load_ordering_protobuf, load_ordering };

import { gunzipSync } from 'zlib';
import {
    Article, Feature, StringList, ConsolidatedShapes,
    ConsolidatedStatistics, DataLists, OrderLists
} from "./utils/protos.js";
import { index_link, ordering_data_link, ordering_link } from './navigation/links.js';

// from https://stackoverflow.com/a/4117299/1549476

// Load JSON text from server hosted file and return JSON parsed object
function loadJSON(filePath) {
    // Load json file;
    var json = loadTextFileAjaxSync(filePath, "application/json");
    // Parse json
    return JSON.parse(json);
}

// Load text with Ajax synchronously: takes path to file and optional MIME type
function loadTextFileAjaxSync(filePath, mimeType) {
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open("GET", filePath, false);
    if (mimeType != null) {
        if (xmlhttp.overrideMimeType) {
            xmlhttp.overrideMimeType(mimeType);
        }
    }
    xmlhttp.send();
    if (xmlhttp.status == 200 && xmlhttp.readyState == 4) {
        return xmlhttp.responseText;
    }
    else {
        // TODO Throw exception
        return null;
    }
}


// Load a protobuf file from the server
async function loadProtobuf(filePath, name) {
    const response = await fetch(filePath);
    const compressed_buffer = await response.arrayBuffer();
    const buffer = gunzipSync(Buffer.from(compressed_buffer));
    const arr = new Uint8Array(buffer);
    if (name == "Article") {
        return Article.decode(arr);
    } else if (name == "Feature") {
        return Feature.decode(arr);
    } else if (name == "StringList") {
        return StringList.decode(arr);
    } else if (name == "OrderLists") {
        return OrderLists.decode(arr);
    } else if (name == "DataLists") {
        return DataLists.decode(arr);
    } else if (name == "ConsolidatedShapes") {
        return ConsolidatedShapes.decode(arr);
    } else if (name == "ConsolidatedStatistics") {
        return ConsolidatedStatistics.decode(arr);
    } else {
        throw "protobuf type not recognized (see load_json.js)";
    }
}

const order_links = require("./data/order_links.json");
const data_links = require("./data/data_links.json");

async function load_ordering_protobuf(universe, statpath, type, is_data) {
    const links = is_data ? data_links : order_links;
    const key = `${universe}__${type}__${statpath}`;
    const idx = key in links ? links[key] : 0;
    const order_link = is_data ? ordering_data_link(universe, type, idx) : ordering_link(universe, type, idx);
    var ordering = await loadProtobuf(order_link,
        is_data ? "DataLists" : "OrderLists"
    );
    const index = ordering.statnames.indexOf(statpath);
    return is_data ? ordering.dataLists[index] : ordering.orderLists[index];
}

async function load_ordering(universe, statpath, type) {
    const idx_link = index_link(universe, type);
    const data_promise = loadProtobuf(idx_link, "StringList");
    const ordering_promise = load_ordering_protobuf(universe, statpath, type, false);
    const [data, ordering] = await Promise.all([data_promise, ordering_promise]);
    const names_in_order = ordering.orderIdxs.map(i => data.elements[i]);
    return names_in_order;
}