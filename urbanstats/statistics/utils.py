def fractionalize(statistics_table, *columns):
    denominator = sum(statistics_table[c] for c in columns)
    for c in columns:
        statistics_table[c] = statistics_table[c] / denominator
