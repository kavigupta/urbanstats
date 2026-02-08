import { MathJax, MathJaxContext } from 'better-react-mathjax'
import React, { ReactNode } from 'react'
import { FootnoteRef, Footnotes, FootnotesProvider } from 'react-a11y-footnotes'

import './style.css'
import './common.css'
import industry_occupation_table from './data/explanation_industry_occupation_table'
import shapefile_data_credit from './data/shapefile_data_credit'
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

// eslint-disable-next-line no-restricted-syntax -- Header so we can use as tsx tag name
function NRef({ children, name, h: Header = 'h2' }: { children: React.ReactNode, name: string, h?: 'h1' | 'h2' }): ReactNode {
    return (
        <Header id={`explanation_${name}`}>
            {children}
        </Header>
    )
}

export function Shapefiles(): ReactNode {
    // {name: string, dataCredit: {text: string | undefined, linkText: string, link: string}[]}[]
    // make a table of this data, with the link in the second column and the text in the third, if it exists. Put multiple rows on the right 2 columns if there are multiple data credits.
    const colors = useColors()
    return (
        <div style={{ marginLeft: '1em', marginTop: '1em', marginBottom: '1em', border: `1px solid ${colors.textMain}` }}>
            <div style={{ display: 'flex', flexDirection: 'row' }}>
                <div style={{ width: '30%', padding: '1em', border: `1px solid ${colors.textMain}` }}>Shapefile</div>
                <div style={{ width: '70%', padding: '1em', border: `1px solid ${colors.textMain}` }}>Data Credits</div>
            </div>
            {shapefile_data_credit.map(({ names, dataCredits }, i) => (
                <div key={i}>
                    <div style={{ display: 'flex', flexDirection: 'row' }}>
                        <div style={{ width: '30%', border: `1px solid ${colors.textMain}`, padding: '1em', display: 'flex', flexDirection: 'row', verticalAlign: 'middle' }}>
                            <div style={{ width: '100%', margin: 'auto' }}>
                                {names.map((name, j) => (
                                    <div key={j}>{name}</div>
                                ))}
                            </div>
                        </div>
                        <div style={{ width: '70%', border: `1px solid ${colors.textMain}`, display: 'flex', flexDirection: 'column' }}>
                            {dataCredits.map(({ text, linkText, link }, j) => (
                                <div key={j} style={{ display: 'flex', flexDirection: 'row', borderTop: `1px solid ${colors.textMain}`, flexGrow: 1 }}>
                                    <div style={{ width: '25%', borderRight: `1px solid ${colors.textMain}`, padding: '1em' }}>
                                        <a href={link}>{linkText}</a>
                                    </div>
                                    <div style={{ width: '75%', padding: '1em' }}>
                                        <div dangerouslySetInnerHTML={{ __html: text ?? '' }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}
/*
 * Known issue: Lots of MathJax errors when this unloads.
 * Doesn't appear to affect functionality.
 */
export function DataCreditPanel(): ReactNode {
    const textHeaderClass = useHeaderTextClass()

    return (
        <MathJaxContext>
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
                        <h1> Shapefiles </h1>
                        <Shapefiles />

                        <h1>Geography</h1>
                        <div>
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
                                    <MathJax style={{ height: '80px', overflow: 'hidden' }}>
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
                                    <MathJax style={{ height: '80px', overflow: 'hidden' }}>
                                        {
                                            `\\[I(B) = \\sum_{b \\in B} \\sum_r v_b[r] \\frac{p_b v_b[r]}{\\sum_{b'} p_{b'}}\\]`
                                        }
                                    </MathJax>
                                    which can be rearranged to
                                    <MathJax style={{ height: '80px', overflow: 'hidden' }}>
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
                                    <MathJax style={{ height: '53px', overflow: 'hidden' }}>
                                        {
                                            `\\[w_b[r] = \\mathbb E_{b' \\in n(b)} [v_{b'}[r]]\\]`
                                        }
                                    </MathJax>
                                    We define a &ldquo;nearby block&rdquo; similarly to the PW density metric, as a block within a certain
                                    radius of the block in question. Putting this together, we have our homogenity metric:
                                    <MathJax style={{ height: '80px', overflow: 'hidden' }}>
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
                                    <MathJax style={{ height: '80px', overflow: 'hidden' }}>
                                        {
                                            `\\[S(B) = \\frac{H(B) - H_{\\text{min}}(B)}{1 - H_{\\text{min}}(B)}\\]`
                                        }
                                    </MathJax>
                                    where we can compute
                                    <MathJax style={{ height: '53px', overflow: 'hidden' }}>
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
                                    <MathJax style={{ height: '53px', overflow: 'hidden' }}>
                                        {
                                            `\\[S^{\\{10\\}}_{b}(B) = S(n_{10}(b))\\]`
                                        }
                                    </MathJax>
                                    We then compute the average of this metric for each block.
                                    <MathJax style={{ height: '53px', overflow: 'hidden' }}>
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
                                <p>
                                    Median income is directly computed from the census rather than being disaggregated. To ensure we align with the latest counties,
                                    we use ACS 2023 instead of ACS 2021 for this statistic.
                                </p>
                            </div>

                            <NRef name="transportation">Transportation</NRef>
                            <div>
                                <p>
                                    All transportation data is computed using disaggregation from the block group level
                                    to the block level, weighted by adult population. We consider taxi to be a form of
                                    car transportation, and consider motorcycle to be a form of bike transportation.
                                </p>
                                <p>
                                    To compute median commute time, we take the most detailed data available, which is
                                    binned in 10-15minute intervals depending on the bin, and compute an approximate median
                                    by assuming that commute times are uniformly distributed within each bin, with the &gt;60
                                    minute bin being assumed to be 60-120 minutes (this rarely applies anyway).
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

                            <NRef name="ihme">Life Expectancy and IHME Health Care Performance</NRef>
                            <div>
                                <p>
                                    Health care system performance and life expectancy data comes from
                                    {' '}
                                    <FootnoteRef
                                        id="ihme_healthcare"
                                        description={(
                                            <span>
                                                Institute for Health Metrics and Evaluation (IHME). United States Health Care System Performance by County 2014-2019. Seattle, United States of America: Institute for Health Metrics and Evaluation (IHME), 2025.
                                            </span>
                                        )}
                                    >
                                        <a href="https://ghdx.healthdata.org/record/ihme-data/us-health-care-performance-county-2014-2019">IHME</a>
                                    </FootnoteRef>
                                    {'. '}
                                    We use the adjusted system performance data, and use the latest year (2019).
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
                                    {' '}
                                    using
                                    {' '}
                                    <FootnoteRef
                                        description={(
                                            <span>
                                                Gorelick, N., Hancher, M., Dixon, M., Ilyushchenko, S.,
                                                Thau, D., &amp; Moore, R. (2017). Google Earth Engine:
                                                Planetary-scale geospatial analysis for everyone.
                                                <em>Remote Sensing of Environment.</em>
                                            </span>
                                        )}
                                    >
                                        Google Earth Engine
                                    </FootnoteRef>
                                    {'. '}
                                    We collect data over the time period 1990-2020 and
                                    over the 0.25 degree grid.
                                </p>
                                <p>
                                    For each grid point, we compute each of our weather statistics.
                                </p>

                                <ul>
                                    <li>
                                        We compute mean high/low temperatures by aggregating the daily high/low temperature for each day
                                        in the time period, and then taking the mean of these values. We perform a similar
                                        computation for mean high dew point. Using these values, we compute the mean high heat index.
                                    </li>
                                    <li>
                                        We compute mean rainfall and snowfall by aggregating the hourly rainfall and snowfall.
                                        Codes 1 (rain) and 2 (freezing rain) are coded as rain, and codes 5 (snow), 6 (wet snow),
                                        and 8 (ice pellets) are coded as snow. Code 7 (mixed) is coded as 50/50 rain/snow.
                                    </li>

                                    <li>
                                        Wind speed is computed by taking the mean of the hourly wind speed values per day, then comparing
                                        to 10mph per day.
                                    </li>
                                    <li>
                                        We compute the mean hourly sunshine by taking the mean amount of (1 - cloud cover) per daylit hour.
                                        Prior to version 30.0.0, we fractionalized hours based on the amount of time there was daylight,
                                        however, this was computationally difficult using Earth Engine, so we instead used all hours with
                                        any daylight, and subtracted half an hour from the final sunniness metric to compensate.
                                    </li>
                                </ul>
                                <p>
                                    Every statistic except dewpoint and wind-speed are computed using the full 30-year
                                    timespan. Dewpoint and wind speed are computed using a random sample of 2000 days.
                                </p>
                                <p>
                                    Weather statistics were added to all countries in version 30.0.0;
                                    this necessitated switching to Earth Engine and slightly different computation
                                    techniques; as a result they may differ slightly from previous versions.
                                </p>
                                <p>
                                    These estimates are then interpolated using bilinear interpolation to the block
                                    level using the census block centroid for US/Canada and the grid square for international
                                    data. We then compute the population weighted average of these
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
                            and hilliness, we then aggregate these values to 30&quot; blocks, and then
                            use
                            {' '}
                            <a href="#explanation_gpw">GHSL</a>
                            {' '}
                            data to compute the population weighted average of these statistics for each geography
                            for large regions. For American and Canadian regions, we disaggregate to the block level (starting
                            with 15&quot; blocks) via bilinear interpolation and then use the population of each
                            block as a weight.
                        </div>

                        <NRef name="pollution" h="h1">Pollution</NRef>
                        <div>
                            We compute PM2.5 pollution using the Satellite-derived PM2.5 dataset from the
                            {' '}
                            <FootnoteRef
                                description={(
                                    <span>
                                        Shen, S. Li, C. van Donkelaar, A. Jacobs, N. Wang, C. Martin, R. V.:
                                        {' '}
                                        <i>
                                            Enhancing Global Estimation of Fine Particulate Matter Concentrations by
                                            Including Geophysical a Priori Information in Deep Learning.
                                        </i>
                                        {' '}
                                        (2024) ACS ES&T Air. DOI:
                                        {' '}
                                        <a href="https://doi.org/10.1021/acsestair.3c00054">https://doi.org/10.1021/acsestair.3c00054</a>
                                        {'. '}
                                        Accessed 2025.
                                    </span>
                                )}
                            >
                                Atmospheric Composition Analysis group.
                            </FootnoteRef>
                            {'. '}
                            This data is provided at 0.01 degree resolution (36&quot;). We disaggregate to 30&quot; blocks,
                            and then use the same method as for elevation and hilliness to compute population weighted pollution
                            for each geography.
                        </div>

                        <NRef name="election" h="h1">Elections</NRef>

                        <h2>2016 and 2020 Election Data</h2>
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
                        <h2>2008 and 2012 Election Data</h2>
                        <div>
                            2008 and 2012 Election Data is aggregated from counties from
                            {' '}
                            <FootnoteRef
                                description={(
                                    <span>
                                        McGovern, Tony (2025):
                                        {' '}
                                        <i>US County Level Election Results 08-24,</i>
                                        {' '}
                                        <a href="https://github.com/tonmcg/US_County_Level_Election_Results_08-24">https://github.com/tonmcg/US_County_Level_Election_Results_08-24</a>
                                    </span>
                                )}
                            >
                                Tony McGovern.
                            </FootnoteRef>
                            We do not perform disaggregation as counties are massive, instead we only report county level data and
                            data for geographies that are aggregations of counties (states, MSAs, etc). Some counties have changed over
                            time, in cases where modern counties disagree with 2008/2012 counties, we do not report results. Alaska is
                            aggregated into a single &quot;county&quot; for this purpose.
                        </div>
                        <NRef name="election_2024" h="h2">2024 Election Data</NRef>
                        <div>
                            2024 Election Data is from a fork of
                            {' '}
                            <FootnoteRef
                                description={(
                                    <span>
                                        Metcalf, J. (2024):
                                        {' '}
                                        <i>2024 Election Precinct Data,</i>
                                        {' '}
                                        <a href="https://github.com/jmetcalf/2024-election-precinct-data">https://github.com/jmetcalf/2024-election-precinct-data</a>
                                    </span>
                                )}
                            >
                                J Metcalf&apos;s 2024 Election Precinct Data repository
                            </FootnoteRef>
                            {' '}
                            that we have updated with several changes, including pulling in data from the
                            {' '}
                            <FootnoteRef
                                description={(
                                    <span>
                                        New York Times (2024):
                                        {' '}
                                        <i>Presidential Precinct Map 2024,</i>
                                        {' '}
                                        <a href="https://github.com/nytimes/presidential-precinct-map-2024">https://github.com/nytimes/presidential-precinct-map-2024</a>
                                    </span>
                                )}
                            >
                                New York Times
                            </FootnoteRef>
                            {' '}
                            for several states (California, Michigan, Pennsylvania, Massachusetts, New Jersey, Tennessee, and Utah).
                            {' '}
                            For details on how the data has been normalized and processed, see our
                            {' '}
                            <a href="https://github.com/kavigupta/2024Precincts">fork</a>
                            {' '}
                            of the Metcalf repository.
                            .
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
                                GHSL.
                            </FootnoteRef>
                            {' '}
                            We use the 2020 population estimates, which are
                            not perfectly accurate in all cases, but should be the best match to the 2020 Census numbers
                            we are using for the US data. We use the 3&quot; resolution data on a WSG84 (equirectangular) projection.
                            To compute PW density, we treat each cell as effectively homogenous,
                            but since the cells are all smaller than 100m*100m, this should not be a major issue for
                            radii above 1km (which is the smallest radius we use for GHS-POP data). Before 23.13.0, we used
                            the 30&quot; data, which is not as accurate, and led to underestimates of population density
                            in some areas; we continue to use this data for disaggregation purposes, but weather and pollution tend not
                            to vary nearly as much as population, and data is not available at 3&quot; resolution for these datasets.
                        </div>
                        <h1>Canadian Data</h1>
                        <div>
                            <h2>Geography</h2>
                            <div>
                                <p>
                                    We source Canadian geography data from
                                    {' '}
                                    <a href="https://www12.statcan.gc.ca/census-recensement/2021/geo/sip-pis/boundary-limites/index2021-eng.cfm?year=21">StatCan</a>
                                    . Specifically, we use digital boundary files
                                    for provinces/torritories, census divisions, census subdivisions, population centers,
                                    federal electoral districts, and census metropolitan areas. For all of these, we clip
                                    to the international subnational regions as we define them in general, since the
                                    digital boundary files provided by StatCan include unnecessarily large water areas.
                                </p>
                            </div>
                            <NRef name="canadian-census" h="h2">Census Dissemination Block Data</NRef>
                            <div>
                                We use dissemination block data from the 2021 Canada Census. It is available
                                {' '}
                                <a href="https://www12.statcan.gc.ca/census-recensement/2021/geo/aip-pia/geosuite/index2021-eng.cfm?year=21">from StatCan</a>
                                . We use the same metrics as for the US Census to compute population
                                and population density statistics, except using dissemination blocks instead
                                of census blocks. We use this for population and density statistics.
                            </div>
                            <NRef name="canadian-census-disaggregated" h="h2">Census Dissemination Block Data</NRef>
                            <div>
                                <p>
                                    We also use dissemination area data for all statistics other than population and density. This data
                                    is found
                                    {' '}
                                    <a href="https://www12.statcan.gc.ca/census-recensement/2021/dp-pd/prof/details/download-telecharger.cfm?Lang=E">here</a>
                                    . We disaggregate this data to the dissemination block level using either population or
                                    occupied housing units as a weight. We then aggregate to the geography of interest based on the
                                    dissemination block.
                                </p>
                                <p>
                                    For Generation, Marriage, Industry, and Commute time, we are able to use identical definitions to the US data.
                                    For Income, LICO-AT, and ..., we use similar definitions to the US data, but with Canadian-specific
                                    thresholds (e.g., the income thresholds are in CAD, not USD, and we use LICO-AT rather than US Census&apos;s
                                    poverty thresholds).
                                </p>
                            </div>
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
        </MathJaxContext>
    )
}
