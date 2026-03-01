"""Stub for permacache so decorators are typed and do not require per-call type: ignore."""

from typing import Any, Callable, TypeVar

_F = TypeVar("_F", bound=Callable[..., Any])


def permacache(*args: Any, **kwargs: Any) -> Callable[[_F], _F]: ...


def stable_hash(x: object) -> str: ...


def drop_if_equal(x: object) -> Any: ...


def swap_unpickler_context_manager(unpickler: type[Any]) -> Any: ...
