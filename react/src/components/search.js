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
        this.values = undefined;
        this.first_character = undefined;
    }

    render() {
        return (<form autoComplete="off" ref={this.form} style={{ marginBlockEnd: "0em", position: "relative", width: "100%" }}>
            <input
                autoFocus={this.props.autoFocus}
                ref={this.textbox}
                id="searchbox"
                type="text"
                className="serif"
                style={{ backgroundColor: "#fff8f0", borderWidth: "0.1em", ...this.props.style }}
                placeholder={this.props.placeholder}
            />

            <div ref={this.dropdown} style={
                {
                    position: "absolute",
                    width: "100%",
                    maxHeight: "20em",
                    overflowY: "auto",
                    backgroundColor: "#f7f1e8",
                    borderRadius: "0.25em",
                    zIndex: "1"
                }
            }>
                {
                    this.state.matches.map((location, idx) =>
                        <div
                            key={location}
                            className="serif searchbox-dropdown-item"
                            style={this.searchbox_dropdown_item_style(idx)}
                        >{location}</div>
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
            searchbox_dropdown_item_style["backgroundColor"] = "#ffe0e0";
        }

        return searchbox_dropdown_item_style;
    }

    async componentDidMount() {
        this.setState({ is_loaded: true });
        let self = this;
        this.form.current.onsubmit = function () {
            let terms = self.state.matches;
            if (terms.length > 0) {
                self.props.on_change(terms[self.state.focused])
            }
            return false;
        };
        this.textbox.current.onkeyup = function (event) {
            self.update_matches()
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
            dropdowns[i].onclick = () => this.props.on_change(this.state.matches[i]);
            dropdowns[i].onmouseover = () => this.setState({ focused: i });
        }
    }

    async update_matches() {
        let matches = await this.autocompleteMatch(this.textbox.current.value);
        this.setState({ matches: matches });
    }

    async autocompleteMatch(input) {
        input = normalize(input);
        if (input == '') {
            return [];
        }
        const first_character = input[0];
        if (this.first_character != first_character) {
            this.values = loadProtobuf(`/index/pages_${first_character}.gz`, "SearchIndex");
        }
        const values = (await this.values).elements;
        const priorities = (await this.values).priorities;
        let matches = [];
        for (let i = 0; i < values.length; i++) {
            let match_count = is_a_match(input, normalize(values[i]));
            if (match_count == 0) {
                continue;
            }
            if (!this.props.settings.show_historical_cds) {
                if (is_historical_cd(values[i])) {
                    continue;
                }
            }
            if (is_international_duplicate(values[i])) {
                continue;
            }
            matches.push([match_count, i, match_count - priorities[i] / 10]);
        }
        matches = top_10(matches);
        return matches.map((x) => values[x]);
    }

}

function top_10(matches) {
    const num_prioritized = 3;
    const sort_key = idx => {
        return (a, b) => {
            if (a[idx] != b[idx]) {
                return b[idx] - a[idx];
            }
            return a[1] - b[1];
        }
    };
    matches.sort(sort_key(2));
    let overall_matches = [];
    for (let i = 0; i < Math.min(num_prioritized, matches.length); i++) {
        overall_matches.push(matches[i][1]);
        matches[i][0] = -100;
    }
    matches.sort(sort_key(0));
    for (let i = 0; i < Math.min(10 - num_prioritized, matches.length); i++) {
        if (matches[i][0] == -100) {
            break;
        }
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