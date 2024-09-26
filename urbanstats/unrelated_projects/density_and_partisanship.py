from typing import List
import us
import numpy as np

from election_data import with_election_results
from wquantiles import quantile

partisanship_columns = [
    ("2020 Presidential Election", "dem"),
    ("2020 Presidential Election", "gop"),
    ("2020 Presidential Election", "total"),
]


def geoid_to_state(x):
    prefix = "7500000US"
    assert x.startswith(prefix)
    return x[len(prefix) : len(prefix) + 2]


def margin(d, g, t):
    return (d - g) / t


def load_data(n):
    data = with_election_results()
    data = data[data[partisanship_columns[-1]] > 0].copy()
    data["state"] = data.geoid.apply(geoid_to_state)
    data = data.rename(columns={"ad_1": "density"})
    data.density /= data.population
    bins = compute_bins(data.total, data.density, n=n)
    data["bin_idxs"] = bin_idx(bins, data.density)
    return bins, data


def compute_bins(pop, dens, n):
    return [-np.inf] + [quantile(dens, pop, i / n) for i in range(1, n)] + [np.inf]


def compute_by_bin(bins, dgt, dens):
    return [
        margin(*dgt[(low < dens) & (dens <= high)].sum(0))
        for low, high in zip(bins, bins[1:])
    ]


def bin_idx(bins, dens):
    out = np.zeros_like(dens, dtype=np.int16)
    for i, (low, high) in enumerate(zip(bins, bins[1:])):
        out[(low < dens) & (dens <= high)] = i + 1
    return out


size = 800


def plot_by_state(states: List[str], values: np.ndarray, scale):
    # choropleth
    import plotly.graph_objects as go

    # fig = px.choropleth(
    #     locations=[us.states.lookup(s).abbr for s in states],
    #     locationmode="USA-states",
    #     scope="usa",
    #     color=values,
    #     color_continuous_scale="RdBu",
    #     range_color=(-scale, scale),
    #     labels={"color": "Margin"},
    #     title=title,
    # )

    # return fig
    chor = go.Choropleth(
        z=values,
        locationmode="USA-states",
        locations=[us.states.lookup(s).abbr for s in states],
        colorscale="RdBu",
        zmin=-scale,
        zmax=scale,
        colorbar_title="Margin",
    )
    return chor


def plot_several_by_states(states, all_values: List[np.ndarray], titles: List[str], aspect=0.4):
    from plotly.subplots import make_subplots
    import plotly.graph_objects as go

    fig = make_subplots(
        rows=len(all_values),
        cols=1,
        subplot_titles=titles,
        shared_yaxes=True,
        specs=[[{"type": "choropleth"}]] * len(all_values),
        horizontal_spacing = 0.05,
        vertical_spacing = 0.05,
    )
    for i, values in enumerate(all_values):
        fig.add_trace(plot_by_state(states, values, 1), row=i + 1, col=1)
    fig.update_geos(
        projection_type="albers usa",
        showlakes=True,
        lakecolor="rgb(255, 255, 255)",
    )
    fig.update_layout(
        autosize=False,
        width=size,
        height=size * len(all_values) * aspect,
    )
    
    return fig

def plot_density_categories(states, by_state, suffix=""):
    assert by_state.shape[1] == 3
    fig = plot_several_by_states(
        states,
        list(by_state.T),
        ["Among " + x + ": Margin" + suffix for x in ["Least Dense", "Middle Dense", "Most Dense"]]
    )
    return fig