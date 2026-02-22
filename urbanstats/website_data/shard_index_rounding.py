"""Round shard index hashes to multiples of 2^k. No protobuf dependency (for easy unit testing)."""


def _round_down(x, k):
    return ((x >> k) << k) & 0xFFFFFFFF


def round_shard_index_hashes(buckets):
    """Round the start of each bucket down to a multiple of 2^k as much as possible.

    buckets: list of (start, end) for each shard; start/end are 32-bit unsigned hashes.
    Binary search requires index[i] <= hash for hash in shard i, and index[i] > end[i-1]
    so hashes in shard i-1 don't land in shard i. So we need end[i-1] < rounded[i] <= start[i].
    For each bucket we pick the largest k such that _round_down(start, k) > end_prev.
    Returns list of rounded start values (one per bucket).
    """
    if not buckets:
        return []
    out = []
    for i, (start, end) in enumerate(buckets):
        if i == 0:
            lo = -1
        else:
            lo = buckets[i - 1][1]  # end of previous bucket
        # Largest k such that _round_down(start, k) > lo
        r = start
        for k in range(31, -1, -1):
            r = _round_down(start, k)
            if r > lo:
                break
        out.append(r)
    return out
