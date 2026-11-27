import unittest

from urbanstats.website_data.card_basemap import Unsupported, card_basemap


def style(*layers):
    return {
        "layers": [
            {
                "id": "background",
                "type": "background",
                "paint": {"background-color": "#fff8f0"},
            },
            *(
                {"source": "openmaptiles", "source-layer": "water", **layer}
                for layer in layers
            ),
        ]
    }


def drawn(*style_layers):
    return card_basemap(style(*style_layers))["layers"]


def paint(style_layer):
    result = drawn(style_layer)
    assert len(result) == 1
    layer = result[0]
    return {k: v for k, v in layer.items() if k not in ("id", "sourceLayer")}


def line(paint_spec, **rest):
    return {"id": "line", "type": "line", "paint": paint_spec, **rest}


class CardBasemapTest(unittest.TestCase):
    def test_background(self):
        self.assertEqual(card_basemap(style())["background"], "#fff8f0")

    def test_constant_paint_and_filter(self):
        self.assertEqual(
            drawn(
                {
                    "id": "water",
                    "type": "fill",
                    "filter": ["!=", ["get", "intermittent"], 1],
                    "paint": {"fill-color": "#fff", "fill-opacity": 0.5},
                }
            ),
            [
                {
                    "id": "water",
                    "sourceLayer": "water",
                    "filter": ["!=", ["get", "intermittent"], 1],
                    "fill": [[0, "#ffffff"]],
                    "opacity": [[0, 0.5]],
                }
            ],
        )

    def test_style_order_kept(self):
        ids = [
            layer["id"]
            for layer in drawn(
                line({"line-color": "#000000"}, id="b"),
                line({"line-color": "#000000"}, id="a"),
            )
        ]
        self.assertEqual(ids, ["b", "a"])

    def test_line_defaults_and_zooms(self):
        self.assertEqual(
            paint(
                line(
                    {"line-color": "#8e8e8e", "line-dasharray": [2, 1]},
                    minzoom=5,
                    maxzoom=10,
                )
            ),
            {
                "stroke": [[0, "#8e8e8e"]],
                "width": [[0, 1]],
                "dash": [[0, [2, 1]]],
                "minZoom": 5,
                "maxZoom": 10,
            },
        )

    def test_stepped_dash(self):
        dash = ["step", ["zoom"], ["literal", [8, 4]], 9, ["literal", [3, 1]]]
        self.assertEqual(
            paint(line({"line-color": "#000000", "line-dasharray": dash}))["dash"],
            [[0, [8, 4]], [9, [3, 1]]],
        )

    def test_hsl(self):
        self.assertEqual(
            paint(line({"line-color": "hsl(0,0%,70%)"}))["stroke"], [[0, "#b3b3b3"]]
        )

    def test_linear_interpolation_kept_as_stops(self):
        color = ["interpolate", ["linear"], ["zoom"], 8, "#cac6c3", 14, "#4e525a"]
        self.assertEqual(
            paint(line({"line-color": color}))["stroke"],
            [[8, "#cac6c3"], [14, "#4e525a"]],
        )

    def test_exponential_sampled_at_each_zoom(self):
        width = ["interpolate", ["exponential", 2], ["zoom"], 10, 1, 12, 7]
        width = paint(line({"line-color": "#000000", "line-width": width}))["width"]
        self.assertEqual([z for z, _ in width], [10, 11, 12])
        # 1 + 6 * (2 ** 1 - 1) / (2 ** 2 - 1)
        self.assertAlmostEqual(width[1][1], 3)
        self.assertEqual(width[-1], [12, 7])

    def test_exponential_base_one_is_linear(self):
        width = ["interpolate", ["exponential", 1], ["zoom"], 10, 1, 12, 7]
        self.assertEqual(
            paint(line({"line-color": "#000000", "line-width": width}))["width"],
            [[10, 1], [12, 7]],
        )

    def test_layer_per_admin_level(self):
        width = [
            "interpolate",
            ["linear"],
            ["zoom"],
            3,
            ["match", ["get", "admin_level"], 2, 4, [3, 4], 2.5, 1.5],
        ]
        result = drawn(
            line(
                {"line-color": "#4e525a", "line-width": width},
                filter=[">=", ["get", "admin_level"], 3],
            )
        )
        self.assertEqual(
            [(layer["filter"], layer["width"]) for layer in result],
            [
                (
                    [
                        "all",
                        [">=", ["get", "admin_level"], 3],
                        ["==", ["get", "admin_level"], level],
                    ],
                    [[3, expected]],
                )
                for level, expected in [(3, 2.5), (4, 2.5), (5, 1.5), (6, 1.5)]
            ],
        )

    def test_outline_follows_its_fill(self):
        outline = ["interpolate", ["linear"], ["zoom"], 14, "#fff8f0", 16, "#d2cec9"]
        result = drawn(
            {
                "id": "building",
                "type": "fill",
                "minzoom": 13,
                "paint": {"fill-color": "#fff8f0", "fill-outline-color": outline},
            }
        )
        self.assertEqual(
            result[1],
            {
                "id": "building",
                "sourceLayer": "water",
                "stroke": [[14, "#fff8f0"], [16, "#d2cec9"]],
                "width": [[0, 1]],
                "minZoom": 13,
            },
        )

    def test_no_outline_without_antialias(self):
        fill = {
            "fill-color": "#fff8f0",
            "fill-outline-color": "#c1beba",
            "fill-antialias": False,
        }
        self.assertEqual(len(drawn({"id": "area", "type": "fill", "paint": fill})), 1)

    def test_invisible_layers_left_out(self):
        self.assertEqual(
            drawn(
                {
                    "id": "clear",
                    "type": "fill",
                    "paint": {"fill-color": "rgba(0,0,0,0)"},
                },
                line({"line-color": "#000000", "line-opacity": 0}, id="faded"),
                line(
                    {"line-color": "#000000"},
                    id="hidden",
                    layout={"visibility": "none"},
                ),
                {"id": "labels", "type": "symbol"},
            ),
            [],
        )

    def test_other_sources_ignored(self):
        result = card_basemap(
            {
                "layers": [
                    {
                        "id": "background",
                        "type": "background",
                        "paint": {"background-color": "#fff8f0"},
                    },
                    {
                        "id": "transit",
                        "type": "line",
                        "source": "transit",
                        "paint": {"line-color": "#ff0000"},
                    },
                ]
            }
        )
        self.assertEqual(result["layers"], [])

    def test_unsupported_paint_raises(self):
        for unsupported in [
            {"id": "pattern", "type": "fill", "paint": {"fill-pattern": "dots"}},
            {"id": "hex-alpha", "type": "fill", "paint": {"fill-color": "#ffffff80"}},
            line({"line-color": "#000000", "line-offset": 2}),
            line({"line-color": "#000000", "line-width": ["step", ["zoom"], 1, 10, 2]}),
            line({"line-color": "#000000", "line-width": True}),
        ]:
            with self.subTest(unsupported["id"]), self.assertRaises(Unsupported):
                drawn(unsupported)

    def test_unsupported_filter_raises(self):
        for unsupported in [
            ["in", ["get", "class"], "river"],
            ["==", "class", "river"],
            ["match", ["get", "class"], "river", ["coalesce", 1], False],
        ]:
            with self.subTest(unsupported), self.assertRaises(Unsupported):
                drawn(line({"line-color": "#000000"}, filter=unsupported))


if __name__ == "__main__":
    unittest.main()
