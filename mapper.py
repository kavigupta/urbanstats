import plotly.graph_objects as go

BACKGROUND = "#222"


def produce_image(by_county, z, zmin, zmax, output, **kwargs):
    fig = go.Figure(
        go.Choropleth(
            locations=by_county.index,
            z=z,
            colorscale="Viridis",
            zmin=zmin,
            zmax=zmax,
            marker_line_width=0,
            **kwargs,
        )
    )
    fig.update_layout(geo=dict(bgcolor=BACKGROUND, lakecolor=BACKGROUND))
    fig.update_geos(scope="usa")
    fig.update_layout(
        font_family="Cantarell",
        font_color="white",
    )
    fig.write_image(output)
