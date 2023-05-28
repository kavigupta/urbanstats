export { go, showResults };

import { loadJSON } from './load_json.js';

let values = loadJSON("/index/pages.json");

var search_terms = [];
for (var i = 0; i < values.length; i++) {
    search_terms.push(values[i].toLowerCase());
}

function showResults(val) {
    let res = document.getElementById("result");
    res.innerHTML = '';
    let list = '';
    let terms = autocompleteMatch(val);
    for (i = 0; i < terms.length; i++) {
        // escape to be placed in the parameters
        const params = new URLSearchParams()
        params.set('longname', values[terms[i]]);
        list += '<li class="searchresult text"><a href="/article.html?' + params.toString() + '">' + values[terms[i]] + '</a></li>';
    }
    res.innerHTML = '<ul class="searchresults">' + list + '</ul>';
}

function go() {
    let val = document.getElementById("q").value;
    let terms = autocompleteMatch(val);
    if (terms.length > 0) {
        const params = new URLSearchParams()
        params.set('longname', values[terms[0]]);
        window.location.href = '/article.html?' + params.toString();
    }
    return false;
}


function autocompleteMatch(input) {
    input = input.toLowerCase();
    if (input == '') {
        return [];
    }
    var reg = new RegExp(input)
    let matches = [];
    for (let i = 0; i < search_terms.length; i++) {
        if (search_terms[i].match(reg)) {
            matches.push(i);
        }
        if (matches.length >= 10) {
            break;
        }
    }
    return matches;
}
