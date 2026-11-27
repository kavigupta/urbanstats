import unittest

from urbanstats.website_data.card_basemap import card_basemap


def style(*layers):
    return {
        "layers": [
            {
                "id": "background",
                "type": "background",
                "paint": {"background-color": "#fff8f0"},
            },
            *({"source": "openmaptiles", **layer} for layer in layers),
        ]
    }


def paints(*style_layers):
    return card_basemap(style(*style_layers))["layers"]


class CardBasemapTest(unittest.TestCase):
    def test_background(self):
        self.assertEqual(card_basemap(style())["background"], "#fff8f0")

    def test_constant_paint(self):
        self.assertEqual(
            paints(
                {
                    "id": "water",
                    "type": "fill",
                    "paint": {"fill-color": "#fff", "fill-opacity": 0.5},
                }
            ),
            {"water": {"fill": [[0, "#ffffff"]], "opacity": [[0, 0.5]]}},
        )

    def test_line_defaults_and_minzoom(self):
        self.assertEqual(
            paints(
                {
                    "id": "rail",
                    "type": "line",
                    "minzoom": 5,
                    "paint": {"line-color": "#8e8e8e", "line-dasharray": [2, 1]},
                }
            ),
            {
                "rail": {
                    "stroke": [[0, "#8e8e8e"]],
                    "width": [[0, 1]],
                    "dash": [2, 1],
                    "minZoom": 5,
                }
            },
        )

    def test_linear_interpolation_kept_as_stops(self):
        paint = {
            "line-color": [
                "interpolate",
                ["linear"],
                ["zoom"],
                8,
                "#cac6c3",
                14,
                "#4e525a",
            ]
        }
        self.assertEqual(
            paints({"id": "road", "type": "line", "paint": paint})["road"]["stroke"],
            [[8, "#cac6c3"], [14, "#4e525a"]],
        )

    def test_exponential_sampled_at_each_zoom(self):
        paint = {
            "line-color": "#000000",
            "line-width": ["interpolate", ["exponential", 2], ["zoom"], 10, 1, 12, 7],
        }
        width = paints({"id": "road", "type": "line", "paint": paint})["road"]["width"]
        self.assertEqual([z for z, _ in width], [10, 11, 12])
        # 1 + 6 * (2 ** 1 - 1) / (2 ** 2 - 1)
        self.assertAlmostEqual(width[1][1], 3)
        self.assertEqual(width[-1], [12, 7])

    def test_exponential_base_one_is_linear(self):
        paint = {
            "line-color": "#000000",
            "line-width": ["interpolate", ["exponential", 1], ["zoom"], 10, 1, 12, 7],
        }
        self.assertEqual(
            paints({"id": "road", "type": "line", "paint": paint})["road"]["width"],
            [[10, 1], [12, 7]],
        )

    def test_match_on_admin_level(self):
        width = [
            "interpolate",
            ["linear"],
            ["zoom"],
            3,
            ["match", ["get", "admin_level"], 2, 4, [3, 4], 2.5, 1.5],
        ]
        result = paints(
            {
                "id": "border",
                "type": "line",
                "paint": {"line-color": "#4e525a", "line-width": width},
            }
        )
        self.assertEqual(result["border/2"]["width"], [[3, 4]])
        self.assertEqual(result["border/4"]["width"], [[3, 2.5]])
        self.assertEqual(result["border/6"]["width"], [[3, 1.5]])
        self.assertNotIn("border", result)

    def test_outline_of_antialiased_fill(self):
        outline = ["interpolate", ["linear"], ["zoom"], 14, "#fff8f0", 16, "#d2cec9"]
        result = paints(
            {
                "id": "building",
                "type": "fill",
                "paint": {"fill-color": "#fff8f0", "fill-outline-color": outline},
            }
        )
        self.assertEqual(
            result["building/outline"],
            {"stroke": [[14, "#fff8f0"], [16, "#d2cec9"]], "width": [[0, 1]]},
        )

    def test_no_outline_without_antialias(self):
        paint = {
            "fill-color": "#fff8f0",
            "fill-outline-color": "#c1beba",
            "fill-antialias": False,
        }
        self.assertEqual(
            list(paints({"id": "area", "type": "fill", "paint": paint})), ["area"]
        )

    def test_unsupported_layers_left_out(self):
        self.assertEqual(
            paints(
                {
                    "id": "transparent",
                    "type": "fill",
                    "paint": {"fill-color": "rgba(0,0,0,0)"},
                },
                {
                    "id": "translucent-hex",
                    "type": "fill",
                    "paint": {"fill-color": "#ffffff80"},
                },
                {"id": "pattern", "type": "fill", "paint": {"fill-pattern": "dots"}},
                {
                    "id": "capped",
                    "type": "fill",
                    "maxzoom": 10,
                    "paint": {"fill-color": "#ffffff"},
                },
                {
                    "id": "stepped",
                    "type": "line",
                    "paint": {
                        "line-color": "#000000",
                        "line-width": ["step", ["zoom"], 1, 10, 2],
                    },
                },
                {
                    "id": "dash-expression",
                    "type": "line",
                    "paint": {
                        "line-color": "#000000",
                        "line-dasharray": ["literal", [1, 2]],
                    },
                },
                {"id": "labels", "type": "symbol"},
            ),
            {},
        )

    def test_outline_follows_layer_zooms(self):
        result = paints(
            {
                "id": "building",
                "type": "fill",
                "minzoom": 13,
                "paint": {"fill-color": "#fff8f0", "fill-outline-color": "#d2cec9"},
            },
            {
                "id": "capped",
                "type": "fill",
                "maxzoom": 10,
                "paint": {"fill-color": "#fff8f0", "fill-outline-color": "#d2cec9"},
            },
        )
        self.assertEqual(result["building/outline"]["minZoom"], 13)
        self.assertNotIn("capped/outline", result)

    def test_geometry_changing_paint_left_out(self):
        self.assertEqual(
            paints(
                {
                    "id": "offset",
                    "type": "line",
                    "paint": {"line-color": "#000000", "line-offset": 2},
                },
                {
                    "id": "patterned",
                    "type": "fill",
                    "paint": {"fill-color": "#000000", "fill-pattern": "dots"},
                },
                {
                    "id": "boolean-width",
                    "type": "line",
                    "paint": {"line-color": "#000000", "line-width": True},
                },
            ),
            {},
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
        self.assertEqual(result["layers"], {})
