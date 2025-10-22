def fractionalize(statistics_table, *columns):
    assert not isinstance(statistics_table, str)
    denominator = sum(statistics_table[c] for c in columns)
    for c in columns:
        statistics_table[c] = statistics_table[c] / denominator
