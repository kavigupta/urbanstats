import React, { ReactNode } from 'react'
import ReactDOM from 'react-dom/client'
import './style.css'
import './common.css'

import { useColors } from './page_template/colors'
import { PageTemplate } from './page_template/template'

function IndexPanel(): ReactNode {
    const colors = useColors()
    return (
        <PageTemplate>
            <div>
                <div>
                    <img src={colors.bannerURL} alt="Urban Stats Logo" width="100%" />
                </div>

                <div className="centered_text" style={{ textAlign: 'left' }}>
                    <p>
                        Urban Stats is a database of various statistics related to density, housing, race, transportation,
                        elections, and climate change in the United States for a variety of regions; as well as density
                        globally. It is intended to be a resource for journalists, researchers, and anyone else who is
                        interested in these topics. The data is collected from a variety of sources, including the US Census,
                        the GHSL dataset, VEST, and several US government agencies. See
                        {' '}
                        <a href="/data-credit.html">Data Credit</a>
                        {' '}
                        for more information.
                    </p>
                    <p>
                        Website by Kavi Gupta (
                        <a href="https://kavigupta.org">kavigupta.org</a>
                        ,
                        {' '}
                        <a
                            href="https://twitter.com/notkavi"
                        >
                            @notkavi
                        </a>
                        )
                    </p>
                </div>
            </div>
        </PageTemplate>
    )
}

function loadPage(): void {
    const root = ReactDOM.createRoot(document.getElementById('root')!)
    root.render(<IndexPanel />)
}

loadPage()
