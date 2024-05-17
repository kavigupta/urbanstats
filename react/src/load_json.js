export { loadJSON, loadProtobuf, load_ordering };

import { gunzipSync } from 'zlib';
import {
    Article, Feature, StringList, ConsolidatedShapes,
    ConsolidatedStatistics, DataList, OrderList
} from "./utils/protos.js";
import { index_link, ordering_link } from './navigation/links.js';

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
    } else if (name == "OrderList") {
        return OrderList.decode(arr);
    } else if (name == "DataList") {
        return DataList.decode(arr);
    } else if (name == "ConsolidatedShapes") {
        return ConsolidatedShapes.decode(arr);
    } else if (name == "ConsolidatedStatistics") {
        return ConsolidatedStatistics.decode(arr);
    } else {
        throw "protobuf type not recognized (see load_json.js)";
    }
}

async function load_ordering(universe, statpath, type) {
    const idx_link = index_link(universe, type);
    const order_link = ordering_link(universe, statpath, type);
    const data = await loadProtobuf(idx_link, "StringList");
    const ordering = await loadProtobuf(order_link, "OrderList");
    return ordering.orderIdxs.map(i => data.elements[i]);
}