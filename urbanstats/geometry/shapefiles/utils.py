from typing import Protocol

import us


def abbr_to_state(x: str) -> str:
    if "-" in x:
        return "-".join(abbr_to_state(t) for t in x.split("-"))
    s = us.states.lookup(x)
    return s.name if s is not None else x


class _RowWithName(Protocol):
    NAME: str


def name_components(
    x: str, row: _RowWithName, abbreviate: bool = False
) -> tuple[str, str, str]:
    name, state = row.NAME.split(", ")
    return (name + " " + x, (state if abbreviate else abbr_to_state(state)), "USA")
