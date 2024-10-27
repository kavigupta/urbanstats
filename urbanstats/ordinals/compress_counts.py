from urbanstats.statistics.output_statistics_metadata import internal_statistic_names


def compress_counts_sequence(counts):
    """
    Take a sequence like [50, 50, 50, 32, 32, 64] and compress it into
        [[50, 3], [32, 2], [64, 1]]
    """
    result = []
    for c in counts:
        if not result or result[-1][0] != c:
            result.append([c, 1])
        else:
            result[-1][1] += 1
    return result


def compress_counts(counts):
    statcols = list(internal_statistic_names())
    counts_new = {}
    for k in counts:
        counts_for_universe = {}
        for (column, typ), count in counts[k]:
            column = tuple(column) if isinstance(column, list) else column
            if typ not in counts_for_universe:
                counts_for_universe[typ] = {}
            counts_for_universe[typ][column] = count
        counts_for_universe = {
            typ: compress_counts_sequence(
                [counts_for_universe_for_typ[col] for col in statcols]
            )
            for typ, counts_for_universe_for_typ in counts_for_universe.items()
        }
        counts_new[k] = counts_for_universe
    return counts_new


def mapify(lst):
    result = {}
    for (a, b, c), v in lst:
        result[f"{a}__{b}__{c}"] = v
    return result
