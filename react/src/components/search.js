import React from 'react';

export { SearchBox };

import { loadProtobuf } from '../load_json.js';
import { is_historical_cd } from '../utils/is_historical';
import "../common.css";



class SearchBox extends React.Component {
    constructor(props) {
        super(props);
        this.state = { matches: [], is_loaded: false, focused: 0 };
        this.form = React.createRef();
        this.textbox = React.createRef();
        this.dropdown = React.createRef();
        this.values = loadProtobuf("/index/pages.gz", "StringList");
        this._match_cache = {};
    }

    render() {
        return (<form autoComplete="off" ref={this.form} style={{ marginBlockEnd: "0em", position: "relative", width: "100%" }}>
            <input
                autoFocus={this.props.autoFocus}
                ref={this.textbox}
                id="searchbox"
                type="text"
                className="serif"
                style={this.props.style}
                placeholder={this.props.placeholder} />

            <div ref={this.dropdown} style={
                {
                    position: "absolute",
                    width: "100%",
                    maxHeight: "20em",
                    overflowY: "auto",
                    backgroundColor: "#ebebff",
                    borderRadius: "0.25em",
                    zIndex: "1"
                }
            }>
                {
                    this.state.matches.map((i, idx) =>
                        <div
                            key={i}
                            className="searchbox-dropdown-item"
                            style={this.searchbox_dropdown_item_style(idx)}
                        >{this._values[i]}</div>
                    )
                }
            </div>
        </form>);

    }


    searchbox_dropdown_item_style(idx) {
        const searchbox_dropdown_item_style = {
            padding: "0.5em",
            cursor: "pointer"
        };
        if (this.state.focused == idx) {
            searchbox_dropdown_item_style["backgroundColor"] = "#e9d2fd";
        }

        return searchbox_dropdown_item_style;
    }

    async componentDidMount() {
        this._values = (await this.values).elements;
        this.setState({ is_loaded: true });
        let self = this;
        this.form.current.onsubmit = function () {
            return self.go(self.textbox.current.value, self.state.focused)
        };
        this.textbox.current.addEventListener("submit", function () {
            return self.go(self.textbox.current, self.state.focused)
        });
        this.textbox.current.onkeyup = function (event) {
            self.setState({ matches: self.autocompleteMatch(self.textbox.current.value) });
            // if down arrow, then go to the next one
            let dropdowns = document.getElementsByClassName("searchbox-dropdown-item");
            if (dropdowns.length > 0) {
                if (event.key == "ArrowDown") {
                    self.setState({ focused: (self.state.focused + 1) % dropdowns.length });
                }
                if (event.key == "ArrowUp") {
                    self.setState({ focused: (self.state.focused - 1 + dropdowns.length) % dropdowns.length });
                }
            }
        };
        this.componentDidUpdate();
    }

    componentDidUpdate() {
        let dropdowns = document.getElementsByClassName("searchbox-dropdown-item");
        for (let i = 0; i < dropdowns.length; i++) {
            dropdowns[i].onclick = () => this.props.on_change(this._values[this.state.matches[i]]);
            dropdowns[i].onmouseover = () => this.setState({ focused: i });
        }
    }


    go(val, focused) {
        let terms = this.autocompleteMatch(val);
        if (terms.length > 0) {
            this.props.on_change(this._values[terms[focused]])
        }
        return false;
    }

    autocompleteMatch(input) {
        input = normalize(input);
        if (input == '') {
            return [];
        }

        var matches = this._values
            .map((x, i) => [is_a_match(input, normalize(x)), i]);
        
        matches = matches
            .filter(([x, i]) => x > 0);
        this._match_cache[input] = matches;
        if (!this.props.settings.show_historical_cds) {
            matches = matches.filter(([x, i]) => !is_historical_cd(this._values[i]));
        }
        matches = matches.filter(([x, i]) => !is_international_duplicate(this._values[i]));
        return top_10(matches);
    }

}


function top_10(matches) {
    matches.sort(function (a, b) {
        if (a[0] != b[0]) {
            return b[0] - a[0];
        }
        return a[1] - b[1];
    });
    let overall_matches = [];
    for (let i = 0; i < Math.min(10, matches.length); i++) {
        overall_matches.push(matches[i][1]);
    }
    return overall_matches;
}

/*
    Check whether a is a substring of b (does not have to be contiguous)

*/
function is_a_match(a, b) {
    let i = 0;
    let match_count = 0;
    let prev_match = true;
    for (let j = 0; j < b.length; j++) {
        if (a[i] == b[j]) {
            i++;
            if (prev_match) {
                match_count++;
            }
            prev_match = true;
        } else {
            prev_match = false;
        }
        if (i == a.length) {
            return match_count + 1;
        }
    }
    return 0;
}

function normalize(a) {
    return a.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function is_international_duplicate(x) {
    // ends with [SN], USA
    return x.endsWith(" [SN], USA");
}