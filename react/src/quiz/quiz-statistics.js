import React from 'react';

export class QuizStatistics extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        const whole_history = this.props.whole_history;
        const historical_correct = new Array(this.props.today + 1).fill(-1);
        const frequencies = new Array(6).fill(0);
        const played_games = [];
        for (var i = 0; i <= this.props.today; i++) {
            const hist_i = whole_history[i];
            if (hist_i === undefined) {
                continue;
            } else {
                const amount = whole_history[i + ""].correct_pattern.reduce((partialSum, a) => partialSum + a, 0);
                historical_correct[i] = amount;
                frequencies[amount] += 1;
                played_games.push(amount);
            }
        }
        const streaks = new Array(6).fill(0);
        for (var val = 0; val < streaks.length; val++) {
            for (var i = historical_correct.length - 1; i >= 0; i--) {
                if (historical_correct[i] >= val) {
                    streaks[val] += 1;
                } else {
                    break;
                }
            }
        }
        const total_freq = frequencies.reduce((partialSum, a) => partialSum + a, 0);
        const today_score = historical_correct[this.props.today];
        const statistics = [
            {
                name: "Played",
                value: played_games.length,
            },
            {
                name: "Mean score",
                value: (
                    played_games.reduce((partialSum, a) => partialSum + a, 0)
                    / played_games.length
                ).toFixed(2),
            },
            {
                name: "Win Rate (3+)",
                value: (
                    played_games.filter((x) => x >= 3).length
                    / played_games.length * 100
                ).toFixed(0) + "%",
            },
            {
                name: "Current Streak (3+)",
                value: streaks[3],
            },
        ];
        return <div>
            <div className="serif quiz_summary">Your Statistics</div>
            <DisplayedStats statistics={statistics} />
            <div className="gap_small" />
            <table className="quiz_barchart">
                <tbody>
                    {frequencies.map((amt, i) => <tr key={i}>
                        <td className="quiz_bar_td serif">
                            {i}/5
                        </td>
                        <td className="quiz_bar_td serif">
                            <span className="quiz_bar" style={{ width: (amt / total_freq * 20) + "em" }}>
                            </span>
                            {amt > 0 ? (<span className="quiz_stat">{amt} ({(amt / total_freq * 100).toFixed(1)}%)</span>) : undefined}
                        </td>
                    </tr>
                    )}
                </tbody>
            </table>
        </div>;
    }

}
export function AudienceStatistics({ total, per_question, scores }) {
    // two flexboxes of the scores for each
    return <div>
        <div className="serif quiz_summary">Question Difficulty</div>
        <DisplayedStats statistics={per_question.map((x, i) => {
            return {
                name: "Q" + (i + 1) + " Correct",
                value: (x / total * 100).toFixed(0) + "%",
                addtl_class: x / total > 0.5 ? "text_quiz_correct" : "text_quiz_incorrect",
            };
        }
        )} />
        {/* <div className="gap_small" />
        <DisplayedStats statistics={
            scores.map((x, i) => {
                return {
                    name: "Score " + (i) + "/5",
                    value: (x / total * 100).toFixed(0) + "%",
                }
            }
            )
        } /> */}
    </div>;
}
export function DisplayedStats({ statistics }) {
    return <div className="serif" style={{
        textAlign: "center", width: "100%", margin: "auto", fontSize: "1.5em",
        display: "flex", flexWrap: "wrap", justifyContent: "center"
    }}>
        {statistics.map((stat, i) => <DisplayedStat key={i} number={stat.value} name={stat.name} addtl_class={stat.addtl_class} />
        )}
    </div>;
}
export function DisplayedStat({ number, name, addtl_class }) {
    if (addtl_class == undefined) {
        addtl_class = "";
    }
    // large font for numbers, small for names. Center-aligned using flexbox
    return <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "0.3em" }}>
        <div className={"serif " + addtl_class} style={{ fontSize: "1.5em" }}>{number}</div>
        <div className="serif" style={{ fontSize: "0.5em" }}>{name}</div>
    </div>;

}

