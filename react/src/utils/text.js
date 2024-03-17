export { pluralize };

function pluralize(type) {
    if (type.endsWith("y")) {
        return type.slice(0, -1) + "ies";
    }
    return type + "s";
}