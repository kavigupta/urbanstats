import React, { useEffect, useMemo, useRef, useState } from 'react';

import { loadProtobuf } from '../load_json';
import { is_historical_cd } from '../utils/is_historical.js';
import "../common.css";
import { useSetting } from "../page_template/settings.js";

export function SearchBox(props: { on_change: (newValue: string) => void, autoFocus?: boolean, style: React.CSSProperties, placeholder: string }) {
    const [matches, setMatches] = useState<number[]>([]);
    const [focused, setFocused] = useState(0);
    const [values, setValues] = useState<string[] | undefined>(undefined);

    const textBox = useRef<HTMLInputElement>(null);

    useEffect(() => {
        (async () => {
            const { elements } = await loadProtobuf("/index/pages.gz", "StringList")
            setValues(elements)
        })();
    }, []);

    const [show_historical_cds] = useSetting('show_historical_cds');

    const onFormSubmit = () => {
        let terms = autocompleteMatch(textBox.current!.value);
        if (terms.length > 0) {
            props.on_change(values![terms[focused]])
        }
        return false;
    };

    function autocompleteMatch(input: string) {
        if (values === undefined) {
            throw new Error('searching before values loaded')
        }
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
            if (!show_historical_cds) {
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

    const searchbox_dropdown_item_style = (idx: number) => {
        const searchbox_dropdown_item_style: React.CSSProperties = {
            padding: "0.5em",
            cursor: "pointer"
        };
        if (focused == idx) {
            searchbox_dropdown_item_style["backgroundColor"] = "#e9d2fd";
        }

        return searchbox_dropdown_item_style;
    }

    const onTextBoxKeyUp: React.KeyboardEventHandler<HTMLInputElement> = (event) => {
        setMatches(autocompleteMatch(textBox.current!.value))
        // if down arrow, then go to the next one
        let dropdowns = document.getElementsByClassName("searchbox-dropdown-item");
        if (dropdowns.length > 0) {
            if (event.key == "ArrowDown") {
                setFocused(focused => focused + 1 % dropdowns.length)
            }
            if (event.key == "ArrowUp") {
                setFocused(focused => focused - 1 % dropdowns.length)
            }
        }
    }

    return (<form autoComplete="off" onSubmit={onFormSubmit} style={{ marginBlockEnd: "0em", position: "relative", width: "100%" }}>
        <input
            autoFocus={props.autoFocus}
            ref={textBox}
            id="searchbox"
            type="text"
            className="serif"
            style={props.style}
            placeholder={props.placeholder} 
            onKeyUp={onTextBoxKeyUp}
            disabled={values === undefined}
        />

        <div style={
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
                matches.map((i, idx) =>
                    <div
                        key={i}
                        className="searchbox-dropdown-item"
                        style={searchbox_dropdown_item_style(idx)}
                        onClick={() => props.on_change(values![i])}
                        onMouseOver={() => setFocused(idx)}
                    >{values![i]}</div>
                )
            }
        </div>
    </form>);
}

/*
    Check whether a is a substring of b (does not have to be contiguous)
*/
function is_a_match(a: string, b: string) {
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

function normalize(a: string) {
    return a.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function is_international_duplicate(x: string) {
    // ends with [SN], USA
    return x.endsWith(" [SN], USA");
}