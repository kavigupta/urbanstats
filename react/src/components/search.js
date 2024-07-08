import React from 'react';

export { SearchBox };

import { loadProtobuf } from '../load_json.js';
import { is_historical_cd } from '../utils/is_historical';
import "../common.css";

class SearchBox extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            matches: [], matches_stale: false,
            index_cache: undefined, index_cache_uninitialized: true,
            first_character: undefined,
            focused: 0,
        };
        this.form = React.createRef();
        this.textbox = React.createRef();
        this.dropdown = React.createRef();
    }

    render() {

        const self = this;

        const setFocused = (fn) => {
            self.setState({ focused: fn(self.state.focused) })
        }

        const searchbox_dropdown_item_style = idx => {
            return {
                padding: "0.5em",
                cursor: "pointer",
                backgroundColor: (this.state.focused === idx) ? "#ffe0e0" : undefined
            };
        }

        const onFormSubmit = event => {
            event.preventDefault();
            let terms = self.state.matches;
            if (terms.length > 0) {
                self.props.on_change(terms[self.state.focused])
            }
            return false;
        }

        const get_input = () => {
            var input = this.textbox.current.value;
            input = normalize(input);
            return input;
        }

        const reload_cache = () => {
            const input = get_input();
            console.log("RELOADING CACHE")
            if (input == '') {
                console.log("empty input; setting matches to empty array")
                this.setState({ index_cache_uninitialized: false, matches_stale: false, matches: [] })
                return;
            }
            const first_character = input[0];
            if (this.state.first_character != first_character) {
                this.setState({ index_cache_uninitialized: true });
                (async () => {
                    this.setState({ first_character: first_character })
                    this.setState({ index_cache: await loadProtobuf(`/index/pages_${first_character}.gz`, "SearchIndex") });
                    this.setState({ index_cache_uninitialized: false, matches_stale: true });
                })();
                return;
            }
            if (this.state.index_cache_uninitialized) {
                return;
            }
        }

        const onTextBoxKeyUp = (event) => {

            reload_cache();
            this.setState({ matches_stale: true });

            // if down arrow, then go to the next one
            let dropdowns = document.getElementsByClassName("searchbox-dropdown-item");
            if (dropdowns.length > 0) {
                if (event.key == "ArrowDown") {
                    setFocused(focused => (focused + 1) % dropdowns.length)
                }
                if (event.key == "ArrowUp") {
                    setFocused(focused => (focused - 1) % dropdowns.length)
                }
            }
        }

        const update_matches = async () => {
            const input = get_input();
            if (input == '') {
                if (this.state.matches.length > 0) {
                    this.setState({ matches: [] });
                }
                return;
            }
            const values = this.state.index_cache.elements;
            const priorities = this.state.index_cache.priorities;
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
            matches = matches.map(idx => values[idx]);
            console.log("setting matches because of input", input, "matches", matches)
            this.setState({ matches: matches });
            this.setState({ matches_stale: false });
        }

        if (this.state.matches_stale && !this.state.index_cache_uninitialized) {
            update_matches();
        }

        console.log("render: matches", this.state.matches);

        return (
            <form
                autoComplete="off" ref={this.form}
                style={{ marginBlockEnd: "0em", position: "relative", width: "100%" }}
                onSubmit={onFormSubmit}
            >
                <input
                    autoFocus={this.props.autoFocus}
                    ref={this.textbox}
                    id="searchbox"
                    type="text"
                    className="serif"
                    style={{ backgroundColor: "#fff8f0", borderWidth: "0.1em", ...this.props.style }}
                    placeholder={this.props.placeholder}
                    onKeyUp={onTextBoxKeyUp}
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
                                style={searchbox_dropdown_item_style(idx)}
                                onClick={() => this.props.on_change(this.state.matches[idx])}
                                onMouseOver={() => this.setState({ focused: idx })}
                            >{location}</div>
                        )
                    }
                </div>
            </form>
        );

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