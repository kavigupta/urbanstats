# created by cursor
# pylint: disable=all

import re
import xml.etree.ElementTree as ET
from functools import lru_cache

import geopandas as gpd
from shapely.geometry import Point


@lru_cache(maxsize=1)
def load_qgis_layouts_and_maps(qgs_file_path="icons/maps/insets.qgs"):
    """
    Load a QGIS project file and extract layout information including map bounding boxes
    and relative positions on screen for each map in each layout.

    Args:
        qgs_file_path (str): Path to the QGIS project file (.qgs)

    Returns:
        dict: Dictionary with layout names as keys, containing:
            - layout_name: Name of the layout
            - page_size: Page size in mm (width, height)
            - maps: List of maps in the layout, each containing:
                - map_id: ID of the map
                - extent: Geographic extent (lon_min, lat_min, lon_max, lat_max) in WGS84
                - relative_position: Relative position on page (0-1 for x, y)
                - relative_size: Relative size on page (0-1 for width, height)
    """
    # Parse the QGIS project file
    tree = ET.parse(qgs_file_path)
    root = tree.getroot()

    layouts = {}

    # Find the Layouts section
    layouts_elem = root.find("Layouts")
    if layouts_elem is None:
        return layouts

    # Process each layout
    for layout_elem in layouts_elem.findall("Layout"):
        layout_name = layout_elem.get("name", "Unnamed Layout")
        units = layout_elem.get("units", "mm")

        # Get page size from PageCollection
        page_size = (80, 60)  # Default size
        page_collection = layout_elem.find("PageCollection")
        if page_collection is not None:
            # Look for LayoutItem with type 65638 (page background)
            for item in page_collection.findall("LayoutItem"):
                if item.get("type") == "65638":
                    size_attr = item.get("size", "80,60,mm")
                    size_parts = size_attr.split(",")
                    if len(size_parts) >= 2:
                        try:
                            page_size = (float(size_parts[0]), float(size_parts[1]))
                        except ValueError:
                            pass
                    break

        layout_maps = []

        # Process each LayoutItem that is a map (type 65639)
        for item in layout_elem.findall("LayoutItem"):
            if item.get("type") == "65639":  # Map item type
                map_id = item.get("id")
                if map_id is None:
                    raise ValueError(
                        f"Map item in layout '{layout_name}' is missing required 'id' attribute"
                    )

                # Error if map_id matches pattern "Map .*"
                if re.match(r"Map .*", map_id):
                    raise ValueError(
                        f"Invalid map ID '{map_id}' in layout '{layout_name}': IDs matching 'Map .*' pattern are not allowed"
                    )

                # Extract position and size for calculating relative values
                position_attr = item.get("position", "0,0,mm")
                size_attr = item.get("size", "0,0,mm")

                # Parse position
                pos_parts = position_attr.split(",")
                position = (0, 0)
                if len(pos_parts) >= 2:
                    try:
                        position = (float(pos_parts[0]), float(pos_parts[1]))
                    except ValueError:
                        pass

                # Parse size
                size_parts = size_attr.split(",")
                size = (0, 0)
                if len(size_parts) >= 2:
                    try:
                        size = (float(size_parts[0]), float(size_parts[1]))
                    except ValueError:
                        pass

                # Extract geographic extent (transform from Web Mercator to WGS84)
                extent = None
                extent_elem = item.find("Extent")
                if extent_elem is not None:
                    try:
                        xmin = float(extent_elem.get("xmin", 0))
                        ymin = float(extent_elem.get("ymin", 0))
                        xmax = float(extent_elem.get("xmax", 0))
                        ymax = float(extent_elem.get("ymax", 0))

                        # Transform from Web Mercator (EPSG:3857) to WGS84 (EPSG:4326)
                        # Create corner points
                        bottom_left = Point(xmin, ymin)
                        top_right = Point(xmax, ymax)

                        # Create GeoDataFrame with Web Mercator CRS
                        gdf = gpd.GeoDataFrame(
                            geometry=[bottom_left, top_right], crs="EPSG:3857"
                        )

                        # Transform to WGS84
                        gdf_wgs84 = gdf.to_crs("EPSG:4326")

                        # Extract transformed coordinates
                        lon_min = gdf_wgs84.geometry.iloc[0].x
                        lat_min = gdf_wgs84.geometry.iloc[0].y
                        lon_max = gdf_wgs84.geometry.iloc[1].x
                        lat_max = gdf_wgs84.geometry.iloc[1].y

                        # Coordinates are now in WGS84 (lon_min, lat_min, lon_max, lat_max)
                        extent = (lon_min, lat_min, lon_max, lat_max)
                    except (ValueError, TypeError):
                        pass

                # Calculate relative positions and sizes
                relative_position = (0, 0)
                relative_size = (0, 0)
                if page_size[0] > 0 and page_size[1] > 0:
                    relative_position = (
                        position[0] / page_size[0],
                        position[1] / page_size[1],
                    )
                    relative_size = (size[0] / page_size[0], size[1] / page_size[1])

                layout_maps.append(
                    {
                        "map_id": map_id,
                        "extent": extent,
                        "relative_position": relative_position,
                        "relative_size": relative_size,
                    }
                )

        layouts[layout_name] = {
            "layout_name": layout_name,
            "page_size": page_size,
            "units": units,
            "maps": layout_maps,
        }

    return layouts


def main():
    # Load the QGIS layouts and maps
    layouts_data = load_qgis_layouts_and_maps()

    print("=== QGIS Layout and Map Information ===\n")
    print(f"Found {len(layouts_data)} layout(s): {list(layouts_data.keys())}\n")

    if not layouts_data:
        print("No layouts found in the QGIS project file.")
        exit(0)

    # Print detailed information for each layout
    for layout_name, layout_info in layouts_data.items():
        print(f"Layout: {layout_name}")
        print(f"Page size: {layout_info['page_size']} {layout_info['units']}")
        print(f"Number of maps: {len(layout_info['maps'])}")
        print()

        # Print information for each map in the layout
        for i, map_info in enumerate(layout_info["maps"]):
            print(f"  Map {i+1}: {map_info['map_id']}")
            print(f"    Relative position: {map_info['relative_position']}")
            print(f"    Relative size: {map_info['relative_size']}")

            if map_info["extent"]:
                lon_min, lat_min, lon_max, lat_max = map_info["extent"]
                print(f"    Geographic extent (WGS84):")
                print(f"      Longitude: {lon_min:.6f}° to {lon_max:.6f}°")
                print(f"      Latitude: {lat_min:.6f}° to {lat_max:.6f}°")
            else:
                print(f"    Geographic extent: None")
            print()


if __name__ == "__main__":
    main()
