LIGHT_COLOR = "#d7d7ff"
DARK_COLOR = "#8686bf"

DARK_GREEN = "#8ac35a"
DARK_RED = "#f96d6d"
LIGHT_GREEN = "#bddda1"
LIGHT_RED = "#fcabab"

with open("icons/main/thumbnail.svg") as f:
    svg = f.read()

assert svg.count(LIGHT_COLOR) == 3, svg.count(LIGHT_COLOR)
assert svg.count(DARK_COLOR) == 3, svg.count(DARK_COLOR)

svg = svg.replace(LIGHT_COLOR, LIGHT_GREEN, 1)
svg = svg.replace(LIGHT_COLOR, LIGHT_RED, 1)
svg = svg.replace(LIGHT_COLOR, LIGHT_GREEN, 1)
svg = svg.replace(DARK_COLOR, DARK_GREEN, 1)
svg = svg.replace(DARK_COLOR, DARK_RED, 1)
svg = svg.replace(DARK_COLOR, DARK_GREEN, 1)

with open("icons/main/thumbnail-juxtastat.svg", "w") as f:
    f.write(svg)
