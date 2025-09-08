import attr


@attr.s
class SUODataSource:
    hash_key = attr.ib()
    load_fn = attr.ib()
    data_columns = attr.ib()
