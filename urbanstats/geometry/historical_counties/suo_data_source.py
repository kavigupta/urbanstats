import attr


@attr.s
class SUODataSource:
    hash_key = attr.ib()
    load_fn = attr.ib()
    data_columns = attr.ib()

    def __permacache_hash__(self):
        # load_fn is a function, which stable_hash can't hash, so hash_key stands in for it
        return [self.hash_key, self.data_columns]
