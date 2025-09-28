from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import List

import numpy as np

from urbanstats.protobuf import data_files_pb2


class ExtraStatistic(ABC):
    @abstractmethod
    def create(self, data_row):
        pass

    @abstractmethod
    def extra_stat_spec(self, stat_names):
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
            # this is a check for nan
            # pylint: disable=comparison-with-itself
            assert histogram != histogram
            return result
        histogram = normalize_to_uint16(histogram)
        result.histogram.counts.extend(histogram)
        return result

    def extra_stat_spec(self, stat_names):
        return dict(
            type="histogram",
            universe_total_idx=stat_names.index(self.universe_column),
        )


@dataclass
class TimeSeriesSpec(ExtraStatistic):
    years: List[int]
    name: str
    key: str

    def create(self, data_row):
        result = data_files_pb2.ExtraStatistic()
        if isinstance(data_row[self.key], float):
            assert data_row[self.key] != data_row[self.key]
            return result
        result.timeseries.values.extend(data_row[self.key])
        return result

    def extra_stat_spec(self, stat_names):
        return dict(type="time_series", years=self.years, name=self.name)


@dataclass
class MonthlyTimeSeriesSpec(ExtraStatistic):
    name: str
    key: str

    def create(self, data_row):
        result = data_files_pb2.ExtraStatistic()
        if isinstance(data_row[self.key], float):
            assert data_row[self.key] != data_row[self.key]
            return result
        result.timeseries.values.extend(data_row[self.key])
        return result

    def extra_stat_spec(self, stat_names):
        return dict(type="monthly_time_series", name=self.name)


@dataclass
class TemperatureHistogramSpec(ExtraStatistic):
    min_value: float
    max_value: float
    bin_size: float
    key: str

    def create(self, data_row):
        result = data_files_pb2.ExtraStatistic()
        if isinstance(data_row[self.key], float):
            assert data_row[self.key] != data_row[self.key]
            return result
        result.temperature_histogram.counts.extend(
            normalize_to_uint16(data_row[self.key])
        )
        return result

    def extra_stat_spec(self, stat_names):
        return dict(
            type="temperature_histogram",
            min_value=self.min_value,
            max_value=self.max_value,
            bin_size=self.bin_size,
        )


def normalize_to_uint16(histogram):
    histogram = np.array(histogram)
    histogram = histogram / histogram.sum()
    histogram = histogram * (2**16)
    histogram = histogram.round().astype(int)
    return histogram
