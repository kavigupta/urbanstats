from dataclasses import dataclass
from typing_extensions import Self


@dataclass
class FunFact:
    longname: str

    def debug_render(self) -> str:
        """
        Render the fun fact in a human-readable format for debugging.
        """
        raise NotImplementedError("Subclasses must implement debug_render()")

    def subsumes(self, other: "FunFact") -> bool:
        """
        Determine if this fun fact subsumes `other`.
        """
        if not isinstance(other, type(self)):
            return False
        return self.subsumes_same_type(other)

    def subsumes_same_type(self, other: Self) -> bool:
        raise NotImplementedError("Subclasses must implement subsumes_same_type()")


def deduplicate_fun_facts(fun_facts: list[FunFact]) -> list[FunFact]:
    """
    Deduplicate a list of fun facts, keeping only the most impressive fun fact in each equivalence class.
    """
    dropped_indices = set()
    for i, ff1 in enumerate(fun_facts):
        if i in dropped_indices:
            continue
        for j, ff2 in enumerate(fun_facts):
            if j in dropped_indices or i == j:
                continue
            if ff1.subsumes(ff2):
                dropped_indices.add(j)
    return [ff for i, ff in enumerate(fun_facts) if i not in dropped_indices]
