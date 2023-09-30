
export { random_color };

function random_color(name) {
    // randomly choose a color hex code where H is between 0 and 360,
    // S is between 50 and 100, and L is between 20 and 50
    // seed random with the hash of longname

    var seed = 0;
    for (var j = 0; j < name.length; j++) {
        seed += name.charCodeAt(j);
        seed *= 31;
        seed %= 1000000007;
    }
    function random() {
        var x = Math.sin(seed++) * 10000;
        return x - Math.floor(x);
    }

    return `hsl(${random() * 360}, ${50 + random() * 50}%, ${20 + random() * 30}%)`;
}