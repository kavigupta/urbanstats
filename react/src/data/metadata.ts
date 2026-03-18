export default {
    "displayed_metadata": [
        {
            "index": 0,
            "name": "US Census GeoID",
            "setting_key": "show_metadata_us_census_geoid",
            "show_in_metadata_table": true
        },
        {
            "index": 1,
            "name": "StatCan GeoCode",
            "setting_key": "show_metadata_statcan_geocode",
            "show_in_metadata_table": true
        },
        {
            "index": 4,
            "name": "ISO Code",
            "setting_key": "show_metadata_iso_code",
            "show_in_metadata_table": true
        }
    ],
    "external_link_metadata": [
        {
            "index": 2,
            "site": "Wikidata",
            "link_prefix": "https://www.wikidata.org/wiki/",
            "normalizer": null,
            "show_in_metadata_table": false
        },
        {
            "index": 3,
            "site": "Wikipedia",
            "link_prefix": "https://en.wikipedia.org/wiki/",
            "normalizer": "wikipedia",
            "show_in_metadata_table": false
        }
    ]
} as const