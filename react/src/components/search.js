import React from 'react';

export { SearchBox };

import { loadJSON } from '../load_json.js';
import { article_link } from '../navigation/links';
import { is_historical_cd } from '../utils/is_historical';
import "../common.css";

class SearchBox extends React.Component {
    constructor(props) {
        super(props);
        this.state = { matches: [] };
        this.form = React.createRef();
        this.textbox = React.createRef();
        this.dropdown = React.createRef();
        this.values = loadJSON("/index/pages.json");
    }

    render() {
        return (<form autoComplete="off" ref={this.form} style={{ marginBlockEnd: "0em" }}>
            <input
                ref={this.textbox}
                type="text"
                className="searchbox serif"
                list="search-result"
                placeholder="Search Density Database" />
            <datalist id="search-result">
                {this.state.matches.map((i) => <option key={i} value={this.values[i]} />)}
            </datalist>
        </form>);

    }


    componentDidMount() {
        let self = this;
        this.form.current.onsubmit = function () { return self.go(self.values, self.textbox.current) };
        this.textbox.current.addEventListener("submit", function () {
            return self.go(self.props.settings, self.values, self.textbox.current)
        });
        this.textbox.current.onkeyup = function () {
            self.setState({ matches: autocompleteMatch(self.props.settings, self.values, self.textbox.current.value) });
        };
        this.textbox.current.addEventListener('input', function (e) {
            let input = e.target;
            let val = input.value;
            let list = input.getAttribute('list');

            let options = document.getElementById(list).childNodes;

            for (var i = 0; i < options.length; i++) {
                if (options[i].value === val) {
                    self.go(self.props.settings, self.values, self.textbox.current);
                    break;
                }
            }
        });
    }

    go(settings, values, textbox) {
        let val = textbox.value;
        let terms = autocompleteMatch(settings, values, val);
        if (terms.length > 0) {
            window.location.href = article_link(values[terms[0]]);
        }
        return false;
    }
}


function autocompleteMatch(settings, values, input) {
    input = input.toLowerCase();
    if (input == '') {
        return [];
    }
    let matches = [];
    for (let i = 0; i < values.length; i++) {
        if (!is_a_match(input, values[i].toLowerCase())) {
            continue;
        }
        if (!settings.show_historical_cds) {
            if (is_historical_cd(values[i])) {
                continue;
            }
        }
        matches.push(i);
        if (matches.length >= 10) {
            break;
        }
    }
    return matches;
}

/*
    Check whether a is a substring of b.

*/
function is_a_match(a, b) {
    return b.includes(a);
}