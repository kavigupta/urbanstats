"""Round shard index hashes to multiples of 2^k. No protobuf dependency (for easy unit testing)."""


def _round_down(x, k):
    return ((x >> k) << k) & 0xFFFFFFFF


def round_shard_index_hashes(starts):
    """Round starting hashes down to multiples of 2^k as much as possible while keeping the sequence strictly increasing.

    Each element may be rounded with a different k (per-element rounding).
    Input: list of int (32-bit hash values), strictly increasing.
    Output: list of int, strictly increasing, each rounded down to a multiple of 2^k for some k.
    Used to reduce index size / improve compressibility.
    """
    if not starts:
        return []
    out = []
    for i, s in enumerate(starts):
        if i == 0:
            # No lower bound; round down as much as possible.
            r = _round_down(s, 31)
        else:
            lo = starts[i - 1]
            for k in range(31, -1, -1):
                r = _round_down(s, k)
                if r > lo:
                    break
        out.append(r)
    return out
