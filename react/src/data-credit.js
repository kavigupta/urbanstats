import React from 'react';

import ReactDOM from 'react-dom/client';
import "./style.css";
import "./common.css";
import { PageTemplate } from "./page_template/template.js";
import { headerTextClass } from './utils/responsive.js';

function ScrollHereOnceLoaded(props) {
    const ref = React.useRef(null);
    React.useEffect(() => {
        if (ref.current) {
            ref.current.scrollIntoView();
        }
    }, [ref.current]);
    return <div ref={ref}>{props.children}</div>;
}

class DataCreditPanel extends PageTemplate {
    constructor(props) {
        super(props);
        this._refs = {};
    }

    nref(name) {
        name = "explanation_" + name;
        this._refs[name] = React.createRef();
        return this._refs[name];
    }

    main_content() {
        return (
            <div className="serif">
                <div className={headerTextClass()}>Data Credit</div>

                <h1>Geography</h1>
                <div>
                    <h2>Shapefiles</h2>
                    <div>
                        <p>
                            Shapefiles on States, MSAs, CSAs, Counties, County subdivisions, Cities (CDPs),
                            Zip Codes (ZCTAs), Native Reservations, Native Reservation Subdivisions,
                            School Districts, Congressional Districts, and State Legislative Districts
                            are from the 2020 Census. USDA County Type shapefiles are aggregated from
                            county shapefiles, using the definitions from <a href="https://www.ers.usda.gov/data-products/county-typology-codes/">the USDA</a>.
                        </p>
                        <p>
                            Shapefiles on Judicial Districts are from the HIFLD Open Data Portal.
                            Neighborhood shapefiles are from the 2017 Zillow Neighborhood Boundaries.
                            Shapefiles on Census Tracts, Census Block Groups, and Census Blocks are from the 2010 Census.
                            Shapefiles on historical congressional districts are mostly from UCLA with some
                            additions from thee Data Gov portal and the NC legislature. Media market
                            shapefiles are from <a href="https://datablends.us/2021/01/14/a-useful-dma-shapefile-for-tableau-and-alteryx/">Kenneth C Black</a>.
                        </p>
                        <p>Shapefiles on Medicare regions (Hospital Referral Regions and Hospital Service Areas) come from <a href="https://data.dartmouthatlas.org/supplemental/#boundaries">the Dartmouth Atlas</a>.
                        </p>
                        <p>
                            Subnational shapefiles are from <a href=" https://hub.arcgis.com/datasets/esri::world-administrative-divisions/explore?location=41.502196%2C25.823236%2C6.69">ESRI</a>.
                            National shapefiles are aggregated from subnational shapefiles.
                            We filter international regions for those with area above 10 km<sup>2</sup>.
                        </p>
                        <p>
                            Urban center shapefiles are sourced from the Global Human Settlement Layer's&nbsp;
                            <a href="https://human-settlement.emergency.copernicus.eu/ghs_stat_ucdb2015mt_r2019a.php">
                                Urban Centre Database v1.2
                            </a>.&nbsp;
                            We filtered this dataset for urban centers with a quality code (QA2_1V) of 1, indicating a true
                            positive, and which are named.
                        </p>
                    </div>
                    <h2 ref={this.nref("geography")}>Geography Metrics</h2>
                    <div>
                        <p>
                            We compute area using the projection <a href="https://proj.org/en/9.3/operations/projections/cea.html">CEA</a>.
                            This is a projection that preserves area, so we can compute area in square meters.
                        </p>
                        <p>
                            We compute compactness using the Polsby-Popper score, which is defined as
                            4 * pi * area / perimeter^2. This is a standard measure of compactness, that
                            defines the circle as the most compact shape with a score of 1.0.
                        </p>
                    </div>
                </div>
                <h1>Census Data</h1>
                <div>

                    All data listed in this section is collected from the 2020 US Census.

                    <h2 ref={this.nref("population")}>Population</h2>
                    <div>
                        <p>
                            We compute population data as the column POP100. This is the total population
                            by census block.
                        </p>
                    </div>
                    <h2 ref={this.nref("density")}>Density Metrics</h2>
                    <div>
                        <p>
                            AW (area weighted) density is the standard Population/Area density.
                            PW (population weighted) density with a radius of X is the population-weighted density within
                            X miles of each census block's interior point, as defined by the census. For more information,
                            see <a href="https://kavigupta.org/2021/09/26/Youre-calculating-population-density-incorrectly/">this page</a>.
                        </p>
                    </div>
                    <h2 ref={this.nref("race")}>Race</h2>
                    <div>
                        <p>
                            Race data is as defined by the census. Here, all the categories other than Hispanic are
                            specifically non-Hispanic. E.g., White is non-Hispanic White.
                        </p>
                    </div>

                    <h2 ref={this.nref("housing-census")}>Vacancy and Units Per Adult</h2>
                    <div>
                        <p>
                            We compute vacancy as the percentage of housing units that are vacant. We compute
                            units per adult as the number of housing units divided by the number of adults.
                        </p>
                    </div>
                </div>

                <h1>American Community Survey Data</h1>
                <div>
                    All data listed in this section is collected from the 2021 American Community Survey 5-year estimates.

                    <h2 ref={this.nref("citizenship")}>Citizenship</h2>
                    <div>
                        <p>
                            We analyze citizenship data by dividing the population into Citizen by Birth, Citizen by Naturalization,
                            and Not a Citizen. These will always add to 100%. This data is disaggregated from the tract
                            level to the block level using overall population as a weight.
                        </p>
                    </div>
                    <h2 ref={this.nref("birthplace")}>Birthplace</h2>
                    <div>

                        <p>
                            We analyze birthplace data by dividing the population into Born in State, Born in Other State,
                            and Born Outside the US. These will always add to 100%. This data is disaggregated from the tract
                            level to the block level using overall population as a weight.
                        </p>
                    </div>

                    <h2 ref={this.nref("language")}>Language Spoken at Home</h2>
                    <div>
                        <p>
                            We analyze language data by dividing the population into English Only, Spanish, and Other.
                            These will always add to 100%. This data is disaggregated from the tract
                            level to the block level using overall population as a weight.
                        </p>
                    </div>

                    <h2 ref={this.nref("education")}>Education</h2>
                    <div>
                        <p>
                            We analyze education data by computing the percentage of the population over 25 with <b>at least</b>
                            a high school degree, a bachelor's degree, or a graduate degree. These will not add to 100%.
                            This data is disaggregated from the block group level to the block level using adult population
                            as a weight.
                        </p>
                        <p>
                            We also compute as a percentage of the population the kind of degree the population has.
                            We group Science and Engineering related fields into STEM, and Education into the
                            Humanities.
                            These will not add to 100%. This data is disaggregated from the block group level to the block level
                            using adult population as a weight.
                        </p>
                    </div>

                    <h2 ref={this.nref("generation")}>Generation</h2>
                    <div>
                        Generations are defined as follows:
                        <ul>
                            <li>Silent: up to 1946</li>
                            <li>Boomer: 1946-1966</li>
                            <li>GenX: 1967-1981</li>
                            <li>Millenial: 1982-1996</li>
                            <li>GenZ: 1997-2011</li>
                            <li>GenAlpha: 2012-2021</li>
                        </ul>
                        These will add to 100%. This data is disaggregated from the block group level to the block level
                        using overall population as a weight.
                    </div>
                    <h2 ref={this.nref("income")}>Income</h2>
                    <div>
                        <p>
                            We use the census definition of poverty status, disaggregating from the tract level to the block level
                            using overall population as a weight.
                        </p>
                        <p>
                            We analyze income data by computing the percentage of the adult population with an income
                            between $0 and $50k, between $50k and $100k, and above $100k. These will add to 100%.

                            We compute both individual and household income, disaggregating from the tract level to the block level
                            using adult population as a weight for indivividual income and occupied housing units as a weight for household income.
                        </p>
                    </div>

                    <h2 ref={this.nref("transportation")}>Transportation</h2>
                    <div>
                        <p>
                            All transportation data is computed using disaggregation from the block group level
                            to the block level, weighted by adult population. We consider taxi to be a form of
                            car transportation, and consider motorcycle to be a form of bike transportation.
                        </p>
                    </div>

                    <h2 ref={this.nref("industry_and_occupation")}>Industry and Occupation</h2>
                    <div>
                        <p>
                            We disaggregate industry data from the block group level to the block level using population
                            over 18 as a weight. Numbers are percentages of the employed population.
                        </p>
                    </div>

                    <h2 ref={this.nref("housing-acs")}>Housing</h2>
                    <div>
                        <p>
                            All housing statistics are computed using disaggregation from the tract level to the block level,
                            weighted by occupied housing units.
                        </p>
                    </div>
                    <h2 ref={this.nref("internet")}>Internet Access</h2>
                    <div>
                        <p>
                            We analyze internet access data by taking a percentage of households without
                            internet access, disaggregating from the block group level to the block level,
                            weighted by occupied housing units.
                        </p>
                    </div>
                    <h2 ref={this.nref("insurance")}>Insurance Access</h2>
                    <div>
                        <p>
                            We analyze insurance data by dividing the population into those with private insurance,
                            public insurance, and no insurance. These will always add to 100%.

                            We group together Medicare, Medicaid, and other public insurance into public insurance,
                            and group together employer-based insurance, direct-purchase insurance, and other private
                            insurance into private insurance. This data is disaggregated from the tract level
                            to the block level using overall population as a weight.
                        </p>
                    </div>
                    <h2 ref={this.nref("marriage")}>Marriage</h2>
                    <div>
                        <p>
                            We analyze marriage data by dividing the over-15 population into those who are married,
                            never married, and divorced. These will always add to 100%.
                            This data is disaggregated from the tract level to the block level using adult population
                            as a weight.
                        </p>
                    </div>
                    <h2 ref={this.nref("weather")}>Weather</h2>
                    <div>
                        <p>
                            Special thanks to <a href="https://twitter.com/OklahomaPerson">OklahomaPerson</a> for helping understand meterological data and help me
                            provide a list of statistics to present.
                        </p>
                        <p>
                            We collected weather data from <a href="https://cds.climate.copernicus.eu/cdsapp#!/dataset/reanalysis-era5-single-levels?tab=overview">ERA5</a>,
                            a reanalysis dataset from the European Centre for
                            Medium-Range Weather Forecasts. We collect data over the time period 1991-2021 and
                            over the 0.25 degree grid.
                        </p>
                        <p>
                            For each grid point, we compute each of our weather statistics.

                            We compute mean high temperatures by aggregating the daily high temperature for each day
                            in the time period, and then taking the mean of these values. We perform a similar
                            computation for mean high dew point. Using these values, we compute the mean high heat index.

                            We compute mean rainfall and snowfall by aggregating the hourly rainfall and snowfall.
                            Codes 1 (rain) and 2 (freezing rain) are coded as rain, and codes 5 (snow), 6 (wet snow),
                            and 8 (ice pellets) are coded as snow. Code 7 (mixed) is coded as 50/50 rain/snow.
                        </p>
                        <p>
                            These estimates are then interpolated to the block level using the census block centroid
                            using bilinear interpolation. We then compute the population weighted average of these
                            statistics for each geography.
                        </p>
                    </div>
                </div>

                <h1 ref={this.nref("election")}>Voting and Elections Science Team Data</h1>
                <div>
                    Election Data is from the US Elections Project's Voting and Elections Science Team
                    (<a href="https://twitter.com/VEST_Team">VEST</a>).

                    Election Data is approximate and uses
                    VTD estimates when available. Data is precinct-level, disaggregated to the census block level
                    and then aggregated to the geography of interest based on the centroid. Results might not
                    match official results. Data is from the 2016 and 2020 US Presidential general elections. N/A
                    indicates that the statistic is not available for the given geography, possibly because the
                    precinct boundaries in the dataset are slightly inaccurate, or there are no results for
                    the precincts overlapping the geography.
                </div>
                <h1 ref={this.nref("park")}>Parkland</h1>
                <div>
                    We compute the percentage of each 1km disc around each census block that is parkland.
                    We then compute the population weighted average of this statistic for each geography.
                    Data on parkland is from OSM. Thanks to <a href="https://twitter.com/itsellie2x">Ellie</a> for
                    helping process the park data.
                </div>
                <h1>Distance from Features</h1>
                <div>
                    We compute two statistics for each census block: the distance to the nearest feature, and
                    whether the census block is within some distance of the feature. We then compute
                    the population weighted average of these statistics for each geography.
                    <h2 ref={this.nref("hospital")}>Hospitals</h2>
                    <div>
                        Hospital data is from HIFLD via <a href="https://www.kaggle.com/datasets/carlosaguayo/usa-hospitals">Kaggle</a>.
                        We pick 10km as the distance threshold for hospitals.
                    </div>
                    <h2 ref={this.nref("airport")}>Airports</h2>
                    <div>

                        <p>
                            Airport data is from OurAirports via
                            <a href="https://hub.arcgis.com/datasets/esri-de-content::world-airports/about">ArcGIS Hub</a>
                        </p>
                    </div>
                    <h2 ref={this.nref("transit")}>Transit Stops</h2>
                    <div>
                        Train stop data is from OSM. Special thanks to <a href="https://twitter.com/averyhatestwt">Avery</a> for helping process the train stop
                        data.
                    </div>
                    <h2 ref={this.nref("superfund")}>Superfund Sites</h2>
                    <div>
                        Superfund site data is from the EPA via
                        <a href="https://catalog.data.gov/dataset/u-s-epa-national-priorities-list-npl-sites-point-data-with-ciesin-modifications-version-2">
                            Data Gov
                        </a>
                    </div>
                    <h2 ref={this.nref("school")}>Schools</h2>
                    <div>
                        School data is from NCES via
                        <a href="https://hifld-geoplatform.opendata.arcgis.com/datasets/geoplatform::public-schools/about">HIFLD</a>.
                    </div>
                </div>
                <h1 ref={this.nref("gpw")}>Gridded Population</h1>
                <div>
                    Gridded population data is from Schiavina M., Freire S., Carioli A., MacManus K. (2023): GHS-POP R2023A - GHS population grid multitemporal (1975-2030).European Commission, Joint Research Centre (JRC)
                    {/* PID: http://data.europa.eu/89h/2ff68a52-5b5b-4a22-8f40-c41da8332cfe, doi:10.2905/2FF68A52-5B5B-4A22-8F40-C41DA8332CFE */}
                    PID: <a href="http://data.europa.eu/89h/2ff68a52-5b5b-4a22-8f40-c41da8332cfe">http://data.europa.eu/89h/2ff68a52-5b5b-4a22-8f40-c41da8332cfe</a>,
                    <a href="https://doi.org/10.2905/2FF68A52-5B5B-4A22-8F40-C41DA8332CFE">10.2905/2FF68A52-5B5B-4A22-8F40-C41DA8332CFE</a>
                    We use the 2020 population estimates, which are
                    not perfectly accurate in all cases, but should be the best match to the 2020 Census numbers
                    we are using for the US data. To compute PW density, we treat each cell as effectively homogenous,
                    but since the cells are all smaller than 1 square kilometer, this should not be a major issue for
                    radii above 1km (which is the smallest radius we use for GHS-POP data).
                </div>
                <h1> Flags </h1>
                <div>
                    Every flag for the universe selector is from Wikipedia. All of them are free to use under
                    any circumstances, at least according to the Wikipedia page for the flag.
                </div>
            </div>
        );
    }

    componentDidMount() {
        this.componentDidUpdate();
    }

    componentDidUpdate() {
        // scroll to fragment
        if (window.location.hash) {
            console.log(window.location.hash);
            const hash = window.location.hash.substring(1);
            if (this._refs[hash]) {
                console.log(this._refs[hash].current)
                // delay to allow page to render
                setTimeout(() => {
                    this._refs[hash].current.scrollIntoView();
                    this._refs[hash].current.classList.add("highlighted_header");
                }, 200);
            }
        }
    }
}

async function loadPage() {
    const root = ReactDOM.createRoot(document.getElementById("root"));
    root.render(<DataCreditPanel />);
}

loadPage();