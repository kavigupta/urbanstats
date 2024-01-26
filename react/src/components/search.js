import React from 'react';

export { SearchBox, LightweightSearchbox };

import { loadProtobuf } from '../load_json.js';
import { article_link } from '../navigation/links';
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
    }

    render() {
        return (<form autoComplete="off" ref={this.form} style={{ marginBlockEnd: "0em", position: "relative", width: "100%" }}>
            <input
                ref={this.textbox}
                id="searchbox"
                type="text"
                className="serif"
                style={{
                    fontSize: "30px",
                    border: "1px solid #444",
                    paddingLeft: "1em",
                    width: "100%",
                    verticalAlign: "middle",
                    height: "50px"
                }}
                placeholder="Search Urban Stats" />

            <div ref={this.dropdown} style={
                {
                    position: "absolute",
                    width: "100%",
                    maxHeight: "20em",
                    overflowY: "auto",
                    backgroundColor: "#ebebff",
                    border: "1px solid #bbb",
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
            searchbox_dropdown_item_style["background-color"] = "#e9d2fd";
        }

        return searchbox_dropdown_item_style;
    }

    async componentDidMount() {
        this._values = (await this.values).elements;
        this.setState({ is_loaded: true });
        let self = this;
        this.form.current.onsubmit = function () {
            return self.go(self.props.settings, self._values, self.textbox.current.value, self.state.focused)
        };
        this.textbox.current.addEventListener("submit", function () {
            return self.go(self.props.settings, self._values, self.textbox.current, self.state.focused)
        });
        this.textbox.current.onkeyup = function (event) {
            self.setState({ matches: autocompleteMatch(self.props.settings, self._values, self.textbox.current.value) });
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
        let self = this;
        let dropdowns = document.getElementsByClassName("searchbox-dropdown-item");
        for (let i = 0; i < dropdowns.length; i++) {
            dropdowns[i].onclick = function (e) {
                window.location.href = article_link(self._values[self.state.matches[i]]);
            }
            dropdowns[i].onmouseover = function (e) {
                self.setState({ focused: i });
            }
        }
    }


    go(settings, values, val, focused) {
        let terms = autocompleteMatch(settings, values, val);
        if (terms.length > 0) {
            window.location.href = article_link(values[terms[focused]]);
        }
        return false;
    }
}

class LightweightSearchbox extends React.Component {
    // like SearchBox but is just a text box that uses a datalist for autocomplete
    constructor(props) {
        super(props);
        this.state = { matches: [], is_loaded: false, focused: 0 };
        this.textbox = React.createRef();
        this.form = React.createRef();
        this.values = loadProtobuf("/index/pages.gz", "StringList");
        this.searchbox_datalist_id = "searchbox-datalist" + Math.random();
    }

    render() {
        // if this.props.autoFocus, then autofocus
        return (<form autoComplete="off" style={{ marginBlockEnd: "0em" }} ref={this.form}>
            <input
                autoFocus={this.props.autoFocus}
                ref={this.textbox}
                id="searchbox"
                type="text"
                placeholder={this.props.placeholder}
                style={this.props.style}
                className="serif"
                list={this.searchbox_datalist_id} />

            <datalist id={this.searchbox_datalist_id}>
                {
                    this.state.matches.map((i, idx) =>
                        <option key={i} value={(this._values)[i]} />
                    )
                }
            </datalist>
        </form>);

    }

    async componentDidMount() {
        this._values = (await this.values).elements;
        this.setState({ is_loaded: true });
        let self = this;
        this.textbox.current.onkeyup = function (event) {
            self.setState({ matches: autocompleteMatch(self.props.settings, self._values, self.textbox.current.value) });
        };
        this.textbox.current.onchange = function (event) {
            for (let i = 0; i < self._values.length; i++) {
                if (self._values[i] == self.textbox.current.value) {
                    self.go(self.props.settings, self._values, self.textbox.current.value);
                    return;
                }
            }
        }
        // submit
        this.form.current.onsubmit = function () {
            self.go(self.props.settings, self._values, self.textbox.current.value);
            return false;
        }
        this.textbox.current.addEventListener("submit", function () {
            self.go(self.props.settings, self._values, self.textbox.current.value);
            return false;
        });
        // on click of dropdown
    }

    go(settings, values, val) {
        try {
            let terms = autocompleteMatch(settings, values, val);
            if (terms.length > 0) {
                this.props.on_change(values[terms[0]]);
            }
        } catch (e) {
            console.log(e);
        }
        return false;
    }
}


function autocompleteMatch(settings, values, input) {
    input = input.toLowerCase();
    input = normalize(input);
    if (input == '') {
        return [];
    }
    let matches = [];
    for (let i = 0; i < values.length; i++) {
        let match_count = is_a_match(input, normalize(values[i].toLowerCase()));
        if (match_count == 0) {
            continue;
        }
        if (!settings.show_historical_cds) {
            if (is_historical_cd(values[i])) {
                continue;
            }
        }
        if (is_international_duplicate(values[i])) {
            continue;
        }
        matches.push([match_count, i]);
    }
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
    return a.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function is_international_duplicate(x) {
    // ends with [SN], USA
    return x.endsWith(" [SN], USA");
}