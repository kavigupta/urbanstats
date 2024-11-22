import { MathJax, MathJaxContext } from 'better-react-mathjax'
import React, { ReactNode } from 'react'
import { FootnoteRef, Footnotes, FootnotesProvider } from 'react-a11y-footnotes'
import ReactDOM from 'react-dom/client'

import './style.css'
import './common.css'
import './data-credit.css'
import industry_occupation_table from './data/explanation_industry_occupation_table'
import { useColors } from './page_template/colors'
import { PageTemplate } from './page_template/template'
import { useHeaderTextClass } from './utils/responsive'

function ExplanationTable(props: { name: string, link: string, table: readonly (readonly [string, string])[] }): ReactNode {
    const colors = useColors()
    return (
        <div>
            Details on the
            {' '}
            {props.name}
            {' '}
            codes can be found
            {' '}
            <a href={props.link}>here</a>
            ,
            a summary is provided below:
            <div style={{ marginLeft: '1em', marginTop: '1em', marginBottom: '1em', border: `1px solid ${colors.textMain}` }}>
                <div>
                    {
                        props.table.map(([name, description], i) => (
                            <div
                                style={{
                                    display: 'flex', flexDirection: 'row',
                                    borderTop: i === 0 ? 'none' : `1px solid ${colors.textMain}`,
                                }}
                                key={i}
                            >
                                <div
                                    style={{ width: '30%', padding: '1em' }}
                                >
                                    {name}
                                </div>
                                <div style={{ width: '70%', padding: '1em' }}>{description}</div>
                            </div>
                        ),
                        )
                    }
                </div>
            </div>
        </div>
    )
}

function NRef({ children, name, h: Header = 'h2' }: { children: React.ReactNode, name: string, h?: 'h1' | 'h2' }): ReactNode {
    return (
        <Header id={`explanation_${name}`}>
            {children}
        </Header>
    )
}

function DataCreditPanel(): ReactNode {
    const textHeaderClass = useHeaderTextClass()
    return (
        <PageTemplate>
            <FootnotesProvider>
                <div className="serif">
                    <div className={textHeaderClass}>Credits</div>

                    <h1>Code contributors</h1>
                    <p>
                        Special thanks to
                        {' '}
                        <a href="https://github.com/lukebrody">Luke Brody</a>
                        &nbsp;
                        for helping with the build system (I&apos;m hopeless with this stuff) and to&nbsp;
                        <a href="https://github.com/glacialcascade">glacialcascade</a>
                        &nbsp;
                        for identifying and correcting a bug in the code.
                    </p>

                    <h1>Geography</h1>
                    <div>
                        <h2>Shapefiles</h2>
                        <div>
                            <p>
                                Shapefiles on States, MSAs, CSAs, Counties, County subdivisions, Cities (CDPs),
                                Zip Codes (ZCTAs), Native Reservations, Native Reservation Subdivisions,
                                School Districts, Congressional Districts, and State Legislative Districts
                                are from the 2020 Census. USDA County Type shapefiles are aggregated from
                                county shapefiles, using the definitions from
                                {' '}
                                <a href="https://www.ers.usda.gov/data-products/county-typology-codes/">the USDA</a>
                                .
                            </p>
                            <p>
                                Shapefiles on Judicial Districts are from the HIFLD Open Data Portal.
                                Neighborhood shapefiles are from the 2017 Zillow Neighborhood Boundaries.
                                Shapefiles on Census Tracts, Census Block Groups, and Census Blocks are from the 2010 Census.
                                Shapefiles on historical congressional districts are mostly from UCLA with some
                                additions from thee Data Gov portal and the NC legislature. Media market
                                shapefiles are from
                                {' '}
                                <a href="https://datablends.us/2021/01/14/a-useful-dma-shapefile-for-tableau-and-alteryx/">Kenneth C Black</a>
                                .
                            </p>
                            <p>
                                Shapefiles on Medicare regions (Hospital Referral Regions and Hospital Service Areas) come from
                                {' '}
                                <a href="https://data.dartmouthatlas.org/supplemental/#boundaries">the Dartmouth Atlas</a>
                                .
                            </p>
                            <p>
                                Subnational shapefiles are from
                                {' '}
                                <a href=" https://hub.arcgis.com/datasets/esri::world-administrative-divisions/explore?location=41.502196%2C25.823236%2C6.69">ESRI</a>
                                .
                                National shapefiles are aggregated from subnational shapefiles.
                            </p>
                            <p>
                                Urban center shapefiles are sourced from the Global Human Settlement Layer&apos;s&nbsp;
                                <a href="https://human-settlement.emergency.copernicus.eu/ghs_stat_ucdb2015mt_r2019a.php">
                                    Urban Centre Database v1.2
                                </a>
                                .&nbsp;
                                We filtered this dataset for urban centers with a quality code (QA2_1V) of 1, indicating a true
                                positive, and which are named.
                            </p>
                            <p>
                                The population circles were defined using the GHS-POP dataset, using an algorithm hand-coded
                                for the purpose of this website. Detailed maps and JSON files are available at&nbsp;
                                <a href="https://github.com/kavigupta/urbanstats/tree/master/outputs/population_circles">
                                    the GitHub repository
                                </a>
                                .
                            </p>
                        </div>
                        <NRef name="geography">Geography Metrics</NRef>
                        <div>
                            <p>
                                We compute area using the projection
                                {' '}
                                <a href="https://proj.org/en/9.3/operations/projections/cea.html">CEA</a>
                                .
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

                        <NRef name="population">Population</NRef>
                        <div>
                            <p>
                                We compute population data as the column POP100. This is the total population
                                by census block.
                            </p>
                        </div>
                        <NRef name="density">Density Metrics</NRef>
                        <div>
                            <p>
                                AW (area weighted) density is the standard Population/Area density.
                                PW (population weighted) density with a radius of X is the population-weighted density within
                                X miles of each census block&apos;s interior point, as defined by the census. For more information,
                                see
                                {' '}
                                <a href="https://kavigupta.org/2021/09/26/Youre-calculating-population-density-incorrectly/">this page</a>
                                .
                            </p>
                        </div>
                        <NRef name="race">Race</NRef>
                        <div>
                            <p>
                                Race data is as defined by the census. Here, all the categories other than Hispanic are
                                specifically non-Hispanic. E.g., White is non-Hispanic White.
                            </p>
                        </div>

                        <NRef name="housing-census">Vacancy and Units Per Adult</NRef>
                        <div>
                            <p>
                                We compute vacancy as the percentage of housing units that are vacant. We compute
                                units per adult as the number of housing units divided by the number of adults.
                            </p>
                        </div>

                        <NRef name="segregation">Segregation</NRef>
                        <div>
                            <p>
                                We compute segregation using a variant of the isolation index as described on
                                pages 288-289 of
                                {' '}
                                <FootnoteRef
                                    id="massey"
                                    description={(
                                        <span>
                                            Massey, Douglas S., and Nancy A. Denton.
                                            {' '}
                                            <a href="https://github.com/user-attachments/files/17184972/s.pdf">
                                                &quot;The Dimensions of Residential Segregation&quot;
                                            </a>
                                            {' '}
                                            Social forces 67.2 (1988): 281-315.
                                        </span>
                                    )}
                                >
                                    Massey and Denton
                                </FootnoteRef>
                                . Our variant attempts to update this metric
                                to work for more than two groups and be geography independent.
                            </p>
                            <p>
                                Technical details follow, but as a TLDR, the three metrics we compute are
                            </p>
                            <ul>
                                <li>
                                    Homogenity: the mean probability that a person will encounter someone
                                    of the same race if they randomly select a person in the 250m circle
                                    centered around them.
                                </li>
                                <li>
                                    Segregation: the homogenity metric normalized to be between 0 and 1,
                                    where 0 is if the region of interest had its population perfectly
                                    equally distributed by race, and 1 is if the region of interest
                                    was perfectly segregated (homogenity 100%).
                                </li>
                                <li>
                                    Local Segregation: the segregation metric in a 10km circle around
                                    each block, averaged over all blocks. This metric is included to
                                    reflect more local patterns of segregation and not penalize, e.g.,
                                    states that have Native American reservations or large states with
                                    far apart cities with distinct racial distributions.
                                </li>
                            </ul>
                            <p>
                                Massey and Denton use the following metric of isolation:
                                <MathJax>
                                    {
                                        `\\[I(r) = \\sum_{b \\in B} v_b[r] \\frac{p_b v_b[r]}{\\sum_{b'} p_b v_{b'}[r]}\\]`
                                    }
                                </MathJax>
                                where
                                {' '}
                                <MathJax inline>{'\\(v_b[r]\\)'}</MathJax>
                                {' '}
                                is the proportion of people of race r in block
                                b,
                                {' '}
                                <MathJax inline>{'\\(p_b\\)'}</MathJax>
                                {' '}
                                is the total population of block b, and
                                B is the set of all blocks.
                            </p>
                            <p>
                                Generalizing this isolation index to more than two groups is relatively straightforward,
                                we simply take the mean of the isolation index for each group, weighted by the population
                                of the group. This yields the metric
                                <MathJax>
                                    {
                                        `\\[I(B) = \\sum_{b \\in B} \\sum_r v_b[r] \\frac{p_b v_b[r]}{\\sum_{b'} p_{b'}}\\]`
                                    }
                                </MathJax>
                                which can be rearranged to
                                <MathJax>
                                    {
                                        `\\[I(B) = \\mathbb E_{b \\in B} \\left[\\sum_r v_b[r] v_b[r]\\right]\\]`
                                    }
                                </MathJax>
                                To make this metric geography independent, we replace
                                {' '}
                                <MathJax inline>{'\\(v_b[r]\\)'}</MathJax>
                                {' '}
                                with
                                the proportion of people who are of that race in nearby blocks, which we define as
                                <MathJax>
                                    {
                                        `\\[w_b[r] = \\mathbb E_{b' \\in n(b)} [v_{b'}[r]]\\]`
                                    }
                                </MathJax>
                                We define a &ldquo;nearby block&rdquo; similarly to the PW density metric, as a block within a certain
                                radius of the block in question. Putting this together, we have our homogenity metric:
                                <MathJax>
                                    {
                                        `\\[H(B) = \\mathbb E_{b \\in B} \\left[\\sum_r v_b[r] w_b[r]\\right] = \\mathbb E_{b \\in B} [v_b^T w_b]\\]`
                                    }
                                </MathJax>
                                The homogenity metric can be interpreted as the mean probability that a person
                                will encounter someone of their own race if they randomly select a person in the
                                radius around them, and is thus independent of the block geography (for radii
                                substantially larger than the block size).
                            </p>
                            <p>
                                Of course, this is merely a metric of homogenity, not segregation. A crucial
                                issue with this metric is that can never be 0, even in a perfectly integrated
                                society. To address this, Massey and Denton normalize their metric, creating the
                                V or Eta squared index, by subtracting out the minimum possible value of the
                                isolation index, then dividing by 1 minus the minimum possible value.

                                We do the same, creating the metric
                                <MathJax>
                                    {
                                        `\\[S(B) = \\frac{H(B) - H_{\\text{min}}(B)}{1 - H_{\\text{min}}(B)}\\]`
                                    }
                                </MathJax>
                                where we can compute
                                <MathJax>
                                    {
                                        `\\[H_{\\text{min}}(B) = \\mathbb E_{b \\in B} [v_b^T] \\mathbb E_{b \\in B} [w_b]\\]`
                                    }
                                </MathJax>
                                as the minimum possible value of the homogenity metric (the one that would be achieved
                                if every block had the same racial distribution).
                            </p>
                            <p>
                                A final issue with the segregation metric as described above is that it is not
                                local. That is, it cannot be expressed as the average of a value computed for each
                                block.
                            </p>
                            <p>
                                To see why this might be problematic, imagine a state that has exactly two
                                cities, 100 miles apart, each of which is perfectly integrated, but one is
                                75% white and 25% black, and the other is 75% black and 25% white.
                            </p>
                            <p>
                                Each individual city would have a homogenity of 62.5%, but a segregation of 0%,
                                since the minimum homogenity is 62.5%. in each city.
                            </p>
                            <p>
                                The state as a whole would have the same homogenity, as expected, because
                                the homogenity metric is in fact local. However, the minimum homogenity for the
                                state would be 50%, since the state as a whole is 50% white and 50% black.
                                This means that the segregation metric would be 25% for the state.
                            </p>
                            <p>
                                In some sense this is a desirable property because one could argue that
                                the state is segregated, even though the cities are not, as people could
                                move between the cities and have not. As such, we do include this metric.
                                However, we also want to include a local segregation metric, to reflect
                                more local patterns of segregation and not penalize states that have, e.g.,
                                Native American reservations.
                            </p>
                            <p>
                                As such, we define a local region block segregation as the segregation metric
                                in a large region around a block (circle of radius 10km).
                                <MathJax>
                                    {
                                        `\\[S^{\\{10\\}}_{b}(B) = S(n_{10}(b))\\]`
                                    }
                                </MathJax>
                                We then compute the average of this metric for each block.
                                <MathJax>
                                    {
                                        `\\[S^{\\{10\\}}(B) = \\mathbb E_{b \\in B} [S^{\\{10\\}}_{b}(B)]\\]`
                                    }
                                </MathJax>
                            </p>
                        </div>
                    </div>

                    <h1>American Community Survey Data</h1>
                    <div>
                        All data listed in this section is collected from the 2021 American Community Survey 5-year estimates.

                        <NRef name="citizenship">Citizenship</NRef>
                        <div>
                            <p>
                                We analyze citizenship data by dividing the population into Citizen by Birth, Citizen by Naturalization,
                                and Not a Citizen. These will always add to 100%. This data is disaggregated from the tract
                                level to the block level using overall population as a weight.
                            </p>
                        </div>
                        <NRef name="birthplace">Birthplace</NRef>
                        <div>

                            <p>
                                We analyze birthplace data by dividing the population into Born in State, Born in Other State,
                                and Born Outside the US. These will always add to 100%. This data is disaggregated from the tract
                                level to the block level using overall population as a weight.
                            </p>
                        </div>

                        <NRef name="language">Language Spoken at Home</NRef>
                        <div>
                            <p>
                                We analyze language data by dividing the population into English Only, Spanish, and Other.
                                These will always add to 100%. This data is disaggregated from the tract
                                level to the block level using overall population as a weight.
                            </p>
                        </div>

                        <NRef name="education">Education</NRef>
                        <div>
                            <p>
                                We analyze education data by computing the percentage of the population over 25 with
                                {' '}
                                <b>at least</b>
                                &nbsp;
                                a high school degree, a bachelor&apos;s degree, or a graduate degree. These will not add to 100%.
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

                        <NRef name="generation">Generation</NRef>
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
                        <NRef name="income">Income</NRef>
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

                        <NRef name="transportation">Transportation</NRef>
                        <div>
                            <p>
                                All transportation data is computed using disaggregation from the block group level
                                to the block level, weighted by adult population. We consider taxi to be a form of
                                car transportation, and consider motorcycle to be a form of bike transportation.
                            </p>
                        </div>

                        <NRef name="health">Health</NRef>
                        <div>
                            <p>
                                Health data comes from
                                {' '}
                                <FootnoteRef
                                    id="cdc_places"
                                    description={(
                                        <span>
                                            CDC, 2023, &quot;PLACES: Local Data for Better Health&quot;,
                                            version August 25, 2023, accessed June 1 2024.
                                        </span>
                                    )}
                                >
                                    CDC Places
                                </FootnoteRef>
                                {'. '}
                                It is computed using disaggregation from the tract level to block level, using the 2010 census tracts
                                (I am not sure why the CDC uses 2010 tracts for 2023 data, but that&apos;s what they do). This data is inherently estimate based.
                            </p>
                        </div>

                        <NRef name="industry_and_occupation">Industry and Occupation</NRef>
                        <div>
                            <p>
                                We disaggregate industry data from the block group level to the block level using population
                                over 18 as a weight. Numbers are percentages of the employed population.
                            </p>

                            <ExplanationTable
                                table={industry_occupation_table.industry}
                                name="Industry"
                                // https://www.bls.gov/cps/cpsaat18.htm
                                link="https://archive.is/e06LF"
                            />
                            <ExplanationTable
                                table={industry_occupation_table.occupation}
                                name="Occupation"
                                link="https://www2.census.gov/programs-surveys/cps/methodology/Occupation%20Codes.pdf"
                            />
                        </div>

                        <NRef name="housing-acs">Housing</NRef>
                        <div>
                            <p>
                                All housing statistics are computed using disaggregation from the tract level to the block level,
                                weighted by occupied housing units.
                            </p>
                        </div>
                        <NRef name="internet">Internet Access</NRef>
                        <div>
                            <p>
                                We analyze internet access data by taking a percentage of households without
                                internet access, disaggregating from the block group level to the block level,
                                weighted by occupied housing units.
                            </p>
                        </div>
                        <NRef name="insurance">Insurance Access</NRef>
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
                        <NRef name="marriage">Marriage</NRef>
                        <div>
                            <p>
                                We analyze marriage data by dividing the over-15 population into those who are married,
                                never married, and divorced. These will always add to 100%.
                                This data is disaggregated from the tract level to the block level using adult population
                                as a weight.
                            </p>
                        </div>
                        <NRef name="sors">Sexual Orientation/Relationship Status</NRef>
                        <div>
                            <p>
                                We take data on sexual orientation and relationship status from the ACS&apos;s household
                                type by relationship data and disaggregate from block groups to blocks. To compute
                                the percentage of the population not cohabiting,
                                we take the percentage of the population that are householders, and subtract out the
                                number of people cohabiting with a partner (yes, this assumes that all cohabiting
                                people in relationships are couples; this is not a perfect assumption, but it is
                                the best we can do). We correspondingly double the number of people who are not
                                a householder but are cohabiting with a partner to get the number of people
                                who are cohabiting with a partner. Finally, all non-householders who are not
                                cohabiting with a partner are divided into children (including foster children,
                                stepchildren, and grandchildren) and a catch-all other category.
                            </p>
                        </div>
                        <NRef name="weather">Weather</NRef>
                        <div>
                            <p>
                                Special thanks to
                                {' '}
                                <a href="https://twitter.com/OklahomaPerson">OklahomaPerson</a>
                                {' '}
                                for helping understand meterological data and help me
                                provide a list of statistics to present.
                            </p>
                            <p>
                                We collected weather data from
                                {' '}
                                <FootnoteRef
                                    description={(
                                        <span>
                                            Hersbach, Hans, et al. &quot;The ERA5 global reanalysis.&quot;
                                            Quarterly Journal of the Royal Meteorological Society
                                            146.730 (2020): 1999-2049.
                                        </span>
                                    )}
                                >
                                    ERA5
                                </FootnoteRef>
                                {'. '}
                                We collect data over the time period 1991-2021 and
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
                        <NRef name="2010">2010 Census</NRef>
                        <div>
                            <p>
                                2010 Census data is treated the same way as 2020 Census data.
                            </p>
                        </div>
                    </div>

                    <NRef name="elevation_hilliness" h="h1">Elevation and Hilliness</NRef>
                    <div>
                        We compute elevation and hilliness using the NASA ASTER Global Digital Elevation Model
                        {' '}
                        <FootnoteRef
                            description={(
                                <span>
                                    NASA/METI/AIST/Japan Spacesystems and U.S./Japan ASTER Science Team.
                                    ASTER Global Digital Elevation Model V003. 2019, distributed by NASA EOSDIS Land
                                    Processes Distributed Active Archive Center,
                                    {' '}
                                    <a href="https://doi.org/10.5067/ASTER/ASTGTM.003">https://doi.org/10.5067/ASTER/ASTGTM.003</a>
                                    {'. '}
                                    Accessed 2024.
                                </span>
                            )}
                        >
                            ASTER GDEM
                        </FootnoteRef>
                        {'. '}
                        We compute hilliness by first computing the absolute grade (rise over run)
                        at each point to a point 100m to the north, east, south, and west. We then
                        take the average of these four values. To compute population weighted elevation
                        and hilliness, we then aggregate these values to 30 arc-second blocks, and then
                        use
                        {' '}
                        <a href="/data-credit.html#explanation_gpw">GPW</a>
                        {' '}
                        data to compute the population weighted average of these statistics for each geography
                        for large regions. For American regions, we disaggregate to the block level (starting
                        with 15 arc-second blocks) via bilinear interpolation and then use the population of each
                        block as a weight.
                    </div>

                    <NRef name="election" h="h1">Voting and Elections Science Team Data</NRef>
                    <div>
                        Election Data is from
                        {' '}
                        <FootnoteRef
                            description={(
                                <span>
                                    Voting and Election Science Team, 2020,
                                    {' '}
                                    &quot;2020 Precinct-Level Election Results&quot;,
                                    {' '}
                                    <a href="https://doi.org/10.7910/DVN/K7760H">https://doi.org/10.7910/DVN/K7760H</a>
                                    , Harvard Dataverse, V45
                                </span>
                            )}
                        >
                            VEST
                        </FootnoteRef>
                        {' '}
                        .
                        {' '}
                        Election Data is approximate and uses
                        VTD estimates when available. Data is precinct-level, disaggregated to the census block level
                        and then aggregated to the geography of interest based on the centroid. Results might not
                        match official results. Data is from the 2016 and 2020 US Presidential general elections. N/A
                        indicates that the statistic is not available for the given geography, possibly because the
                        precinct boundaries in the dataset are slightly inaccurate, or there are no results for
                        the precincts overlapping the geography.
                    </div>
                    <NRef name="park" h="h1">Parkland</NRef>
                    <div>
                        We compute the percentage of each 1km disc around each census block that is parkland.
                        We then compute the population weighted average of this statistic for each geography.
                        Data on parkland is from OSM. Thanks to
                        {' '}
                        <a href="https://twitter.com/itsellie2x">Ellie</a>
                        {' '}
                        for helping process the park data.
                    </div>
                    <NRef name="nhtsa_accidents" h="h1">Traffic Fatality Data</NRef>
                    <div>
                        We compute the number of traffic fatalities in a region based on the
                        {' '}
                        <a href="https://www.nhtsa.gov/research-data/fatality-analysis-reporting-system-fars">NHTSA FARS dataset</a>
                        . We use the decade 2013-2022. Raw numbers for each geography are provided because this is the most accurate
                        information. We then compute a per capita number for each year by dividing the number of fatalities by the
                        population for that year (interpolating between census years).
                        {' '}
                        <b>
                            Note that this is not a perfect measure
                            because the fatalities are not necessarily residents of the geography in which they occur.
                        </b>
                    </div>
                    <h1>Distance from Features</h1>
                    <div>
                        We compute two statistics for each census block: the distance to the nearest feature, and
                        whether the census block is within some distance of the feature. We then compute
                        the population weighted average of these statistics for each geography.
                        <NRef name="hospital">Hospitals</NRef>
                        <div>
                            Hospital data is from HIFLD via
                            {' '}
                            <a href="https://www.kaggle.com/datasets/carlosaguayo/usa-hospitals">Kaggle</a>
                            .
                            We pick 10km as the distance threshold for hospitals.
                        </div>
                        <NRef name="airport">Airports</NRef>
                        <div>

                            <p>
                                Airport data is from OurAirports via&nbsp;
                                <a href="https://hub.arcgis.com/datasets/esri-de-content::world-airports/about">ArcGIS Hub</a>
                            </p>
                        </div>
                        <NRef name="superfund">Superfund Sites</NRef>
                        <div>
                            Superfund site data is from the EPA via&nbsp;
                            <a href="https://catalog.data.gov/dataset/u-s-epa-national-priorities-list-npl-sites-point-data-with-ciesin-modifications-version-2">
                                Data Gov
                            </a>
                        </div>
                        <NRef name="school">Schools</NRef>
                        <div>
                            School data is from NCES via&nbsp;
                            <a href="https://hifld-geoplatform.opendata.arcgis.com/datasets/geoplatform::public-schools/about">HIFLD</a>
                            .
                        </div>
                        <NRef name="usda_fra">Grocery Stores</NRef>
                        <div>
                            We do not compute this using our algorithm. Instead, we use the USDA&apos;s Food Access Research Atlas,
                            which has precomputed numbers by census tract, and we disaggregate these to the block level (using
                            2010 census tracts) using overall population as a weight. For more information, see&nbsp;
                            <a href="https://www.ers.usda.gov/data-products/food-access-research-atlas/">the USDA&apos;s website</a>
                        </div>
                    </div>
                    <NRef name="gpw" h="h1">Gridded Population</NRef>
                    <div>
                        Gridded population data is from
                        {' '}
                        <FootnoteRef description={(
                            <span style={{ fontFamily: 'monospace' }}>
                                Schiavina M., Freire S., Carioli A., MacManus K. (2023): GHS-POP R2023A - GHS population grid multitemporal (1975-2030).European Commission, Joint Research Centre (JRC)
                                {/* PID: http://data.europa.eu/89h/2ff68a52-5b5b-4a22-8f40-c41da8332cfe, doi:10.2905/2FF68A52-5B5B-4A22-8F40-C41DA8332CFE */}
                                PID:
                                {' '}
                                <a href="http://data.europa.eu/89h/2ff68a52-5b5b-4a22-8f40-c41da8332cfe">http://data.europa.eu/89h/2ff68a52-5b5b-4a22-8f40-c41da8332cfe</a>
                                ,
                                <a href="https://doi.org/10.2905/2FF68A52-5B5B-4A22-8F40-C41DA8332CFE">10.2905/2FF68A52-5B5B-4A22-8F40-C41DA8332CFE</a>
                                .
                            </span>
                        )}
                        >
                            GPW.
                        </FootnoteRef>
                        {' '}
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
                <Footnotes />
            </FootnotesProvider>
        </PageTemplate>
    )
}

function loadPage(): void {
    const root = ReactDOM.createRoot(document.getElementById('root')!)
    root.render(
        <MathJaxContext>
            <DataCreditPanel />
        </MathJaxContext>,
    )
}

loadPage()
