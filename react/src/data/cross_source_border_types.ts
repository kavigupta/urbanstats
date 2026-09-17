import used_geographies from './mapper/used_geographies'

type GeographyKind = typeof used_geographies[number]

const value: Partial<Record<GeographyKind, { alternativeGeographyTypes: GeographyKind[], reasonForNoAlternatives: string | null }>> = {
    "Urban Center": {
        "alternativeGeographyTypes": [
            "Urban Area",
            "CA Population Center"
        ],
        "reasonForNoAlternatives": null
    },
    "Metropolitan Cluster": {
        "alternativeGeographyTypes": [
            "Urban Area",
            "CA Population Center"
        ],
        "reasonForNoAlternatives": null
    },
    "5M Person Circle": {
        "alternativeGeographyTypes": [],
        "reasonForNoAlternatives": "Circles are drawn around a point without regard to national borders, and no region type defined by a statistics agency resembles them."
    },
    "10M Person Circle": {
        "alternativeGeographyTypes": [],
        "reasonForNoAlternatives": "Circles are drawn around a point without regard to national borders, and no region type defined by a statistics agency resembles them."
    },
    "20M Person Circle": {
        "alternativeGeographyTypes": [],
        "reasonForNoAlternatives": "Circles are drawn around a point without regard to national borders, and no region type defined by a statistics agency resembles them."
    },
    "50M Person Circle": {
        "alternativeGeographyTypes": [],
        "reasonForNoAlternatives": "Circles are drawn around a point without regard to national borders, and no region type defined by a statistics agency resembles them."
    },
    "100M Person Circle": {
        "alternativeGeographyTypes": [],
        "reasonForNoAlternatives": "Circles are drawn around a point without regard to national borders, and no region type defined by a statistics agency resembles them."
    },
    "200M Person Circle": {
        "alternativeGeographyTypes": [],
        "reasonForNoAlternatives": "Circles are drawn around a point without regard to national borders, and no region type defined by a statistics agency resembles them."
    },
    "500M Person Circle": {
        "alternativeGeographyTypes": [],
        "reasonForNoAlternatives": "Circles are drawn around a point without regard to national borders, and no region type defined by a statistics agency resembles them."
    },
    "1B Person Circle": {
        "alternativeGeographyTypes": [],
        "reasonForNoAlternatives": "Circles are drawn around a point without regard to national borders, and no region type defined by a statistics agency resembles them."
    }
}
export default value