import os
import tempfile
import subprocess

import xml.etree.cElementTree as et

import plotly.graph_objects as go

from load_data import load_county_geojson

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
    fig.update(layout_showlegend=False)
    fig.update(layout_coloraxis_showscale=False)
    fig.update_layout(geo=dict(bgcolor=BACKGROUND, lakecolor=BACKGROUND))
    fig.update_geos(scope="usa")
    fig.write_image(output)


def produce_full_image(by_state, by_county, out_path, radius_display):
    assert out_path.endswith(".png")
    s, c = "states.svg", "counties.svg"
    produce_image(
        by_state,
        by_state.mean_density_weighted,
        0,
        5_000,
        s,
        locationmode="USA-states",
    )
    produce_image(
        by_county,
        by_county.mean_density_weighted,
        0,
        5_000,
        c,
        geojson=load_county_geojson(),
    )
    process(s, s)
    process(c, c)
    with open("template.svg") as f:
        svg = f.read()
        svg = svg.replace("$states", s)
        svg = svg.replace("$counties", c)
        svg = svg.replace("$size", radius_display)
    svg_path = "out.svg"
    with open(svg_path, "w") as f:
        f.write(svg)
    subprocess.check_call(["inkscape", "--export-type=png", svg_path, "-w", "4096"])
    os.rename("out.png", out_path)
    os.remove(svg_path)
    os.remove(s)
    os.remove(c)


def groups(prefix, r):
    for x in r:
        if not x.tag.endswith("}g"):
            continue
        yield prefix, x
        yield from groups((x.attrib.get("class"), *prefix), x)


def grab_group(r, name):
    for _, g in groups((), r):
        #         print(*[repr(x) for x in (*p, g.attrib.get("class"))])
        if g.attrib.get("class") == name:
            return g
    raise RuntimeError("not found")


def process(in_path, out_path):
    with open(in_path) as f:
        result = et.fromstring(f.read())

    gs = [grab_group(result, s) for s in ("choroplethlayer",)]
    result.clear()
    for g in gs:
        result.append(g)
    with open(out_path, "wb") as f:
        f.write(et.tostring(result))

    trim(out_path)


def trim(out_path):
    subprocess.check_call(
        [
            "inkscape",
            "--batch-process",
            "--verb",
            "EditSelectAll;FitCanvasToSelection;FileSave;FileQuit",
            out_path,
        ]
    )
