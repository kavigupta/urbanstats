def get_statistic_column_path(column: str | tuple[str, ...]) -> str:
    """
    Return a sanitized version of the column name for use in a URL.
    """
    if isinstance(column, tuple):
        column = "-".join(str(x) for x in column)
    return column.replace("/", " slash ")
