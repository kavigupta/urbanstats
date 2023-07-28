export { loadJSON, loadProtobuf };

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

const protoPath = "/data_files.proto";
const protobuf = require("protobufjs");

// Load a protobuf file from the server
async function loadProtobuf(filePath, name) {
    const root = await protobuf.load(protoPath);
    const response = await fetch(filePath);
    const compressed_buffer = await response.arrayBuffer();
    const zlib = require("zlib");
    const buffer = zlib.gunzipSync(Buffer.from(compressed_buffer));
    const message = root.lookupType(name);
    const article = message.decode(new Uint8Array(buffer));
    return article;
}