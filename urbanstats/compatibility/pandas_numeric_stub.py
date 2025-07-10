from pandas.core.indexes.base import Index

# Based on https://github.com/pandas-dev/pandas/issues/53300#issuecomment-1553939190
# pylint: disable=abstract-method
# Disabling abstract-method because these classes are stubs and do not implement any methods.


class NumericIndex(Index):
    pass


class IntegerIndex(NumericIndex):
    pass


class Int64Index(IntegerIndex):
    pass


class UInt64Index(IntegerIndex):
    pass


class Float64Index(NumericIndex):
    pass
