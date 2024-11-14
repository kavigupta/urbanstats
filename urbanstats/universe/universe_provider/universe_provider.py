from abc import ABC, abstractmethod


class UniverseProvider(ABC):
    """
    Represents a provider of universe data.
    """

    def hash_key(self):
        """
        Returns a hash key for this provider
        """
        return (self.__class__.__name__, self.hash_key_details())

    @abstractmethod
    def hash_key_details(self):
        """
        Returns a hash key for this provider. Does not include the class name.
        """

    @abstractmethod
    def relevant_shapefiles(self):
        """
        Returns a list of shapefile keys that are relevant to this universe provider
        """

    @abstractmethod
    def universes_for_shapefile(self, shapefiles, shapefile, shapefile_table):
        """
        Returns a dictionary mapping longnames to universes for a given shapefile

        :param shapefiles: A dictionary of shapefiles, mapping relevant shapefile keys to shapefiles
        :param shapefile: The shapefile to compute universes for
        :param shapefile_table: The table of the shapefile
        """
