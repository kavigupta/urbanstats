export { loadJSON, loadProtobuf };

import {gunzipSync} from 'zlib';
import {Article, FeatureCollection} from "./utils/protos.js";

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
    } else if (name == "FeatureCollection") {
        return FeatureCollection.decode(arr);
    } else {
        throw "not recognized";
    }
}