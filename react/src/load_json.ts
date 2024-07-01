export { loadJSON, loadProtobuf };

import { gunzipSync } from 'zlib';
import {
    Article, Feature, StringList, ConsolidatedShapes,
    ConsolidatedStatistics
} from "./utils/protos";

// from https://stackoverflow.com/a/4117299/1549476

// Load JSON text from server hosted file and return JSON parsed object
function loadJSON(filePath: string) {
    // Load json file;
    const json = loadTextFileAjaxSync(filePath, "application/json");
    // Parse json
    return JSON.parse(json);
}

// Load text with Ajax synchronously: takes path to file and optional MIME type
function loadTextFileAjaxSync(filePath: string, mimeType: string) {
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
        throw new Error(`Failed loading ${filePath} status ${xmlhttp.status} readystate ${xmlhttp.readyState}`)
    }
}

// Load a protobuf file from the server
async function loadProtobuf(filePath: string, name: "Article"): Promise<Article>
async function loadProtobuf(filePath: string, name: "Feature"): Promise<Feature>
async function loadProtobuf(filePath: string, name: "StringList"): Promise<StringList>
async function loadProtobuf(filePath: string, name: "ConsolidatedShapes"): Promise<ConsolidatedShapes>
async function loadProtobuf(filePath: string, name: "ConsolidatedStatistics"): Promise<ConsolidatedStatistics>
async function loadProtobuf(filePath: string, name: string) {
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
    } else if (name == "ConsolidatedShapes") {
        return ConsolidatedShapes.decode(arr);
    } else if (name == "ConsolidatedStatistics") {
        return ConsolidatedStatistics.decode(arr);
    } else {
        throw "protobuf type not recognized (see load_json.js)";
    }
}