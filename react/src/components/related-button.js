
import React from 'react';

export { RelatedButton };
import { article_link } from "../navigation/links.js";


class RelatedButton extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        const classes = `button b_${this.props.row_type.toLowerCase()}`
        return (
            <li className="linklistel">
                <a
                    className={classes}
                    href={article_link(this.props.longname)}>{this.props.shortname}
                </a>
            </li>
        );
    }
}