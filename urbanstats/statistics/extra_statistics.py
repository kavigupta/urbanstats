from abc import ABC, abstractmethod
from dataclasses import dataclass

from urbanstats.protobuf import data_files_pb2


class ExtraStatistic(ABC):
    @abstractmethod
    def create(self, data_row):
        pass


@dataclass
class HistogramSpec(ExtraStatistic):
    min_value: float
    bin_size: float
    key: str
    universe_column: str

    def create(self, data_row):
        result = data_files_pb2.ExtraStatistic()
        result.histogram.bin_min = self.min_value
        result.histogram.bin_size = self.bin_size
        histogram = data_row[self.key]
        # nan values are inserted when no histogram is available
        if isinstance(histogram, float):
            assert histogram != histogram
            return result
        histogram = histogram / histogram.sum()
        histogram = histogram * (2**16)
        histogram = histogram.round().astype(int)
        result.histogram.counts.extend(histogram)
        return result
