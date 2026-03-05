from typing import Callable

import attr


@attr.s
class SUODataSource:
    hash_key: str = attr.ib()
    load_fn: Callable[[], object] = attr.ib()
    data_columns: tuple[str, ...] = attr.ib()
