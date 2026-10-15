from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, Tuple

import us


class RowFunction(ABC):
    """
    A function of a row of a shapefile's table that, unlike a lambda, stable_hash can hash. Simple
    ones are built from columns, e.g.

        column("NAMELSAD") + ", USA"
    """

    @abstractmethod
    def __call__(self, row):
        pass

    def __add__(self, other):
        return Concat.of(self, other)

    def __radd__(self, other):
        return Concat.of(other, self)

    def removesuffix(self, suffix):
        return RemoveSuffix(self, suffix)

    def replace(self, old, new):
        return Replace(self, old, new)

    def split_part(self, separator, index):
        return SplitPart(self, separator, index)


@dataclass(frozen=True)
class Column(RowFunction):
    name: str

    def __call__(self, row):
        return row[self.name]


def column(name):
    return Column(name)


@dataclass(frozen=True)
class IndexLabel(RowFunction):
    """The row's label in the table's index, which row.name gives, not a column called name."""

    def __call__(self, row):
        return row.name


@dataclass(frozen=True)
class Constant(RowFunction):
    value: Any

    def __call__(self, row):
        return self.value


@dataclass(frozen=True)
class Concat(RowFunction):
    parts: Tuple[RowFunction, ...]

    @classmethod
    def of(cls, *parts):
        flat = []
        for part in parts:
            if not isinstance(part, RowFunction):
                part = Constant(part)
            flat.extend(part.parts if isinstance(part, Concat) else [part])
        return cls(tuple(flat))

    def __call__(self, row):
        result = self.parts[0](row)
        for part in self.parts[1:]:
            result = result + part(row)
        return result


@dataclass(frozen=True)
class RemoveSuffix(RowFunction):
    inner: RowFunction
    suffix: str

    def __call__(self, row):
        return self.inner(row).removesuffix(self.suffix)


@dataclass(frozen=True)
class Replace(RowFunction):
    inner: RowFunction
    old: str
    new: str

    def __call__(self, row):
        return self.inner(row).replace(self.old, self.new)


@dataclass(frozen=True)
class SplitPart(RowFunction):
    inner: RowFunction
    separator: str
    index: int

    def __call__(self, row):
        return self.inner(row).split(self.separator)[self.index]


@dataclass(frozen=True)
class Lookup(RowFunction):
    inner: RowFunction
    mapping: dict

    def __call__(self, row):
        return self.mapping[self.inner(row)]


@dataclass(frozen=True)
class UsState(RowFunction):
    """The state's name or abbr (an attribute of us.states.State), from its FIPS code or abbreviation."""

    inner: RowFunction
    attribute: str = "name"

    def __call__(self, row):
        return getattr(us.states.lookup(self.inner(row)), self.attribute)
