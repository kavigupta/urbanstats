import React, { ReactNode } from 'react'
import ReactDOM from 'react-dom/client'

import './style.css'
import './common.css'
import { PageTemplate } from './page_template/template'
import { useHeaderTextClass } from './utils/responsive'

function AboutPanel(): ReactNode {
    const headerTextClass = useHeaderTextClass()

    return (
        <PageTemplate>
            <div className="serif">
                <div className={headerTextClass}>About</div>

                <p>
                    Urban Stats is a database of various statistics, computed largely from Census Data for United States
                    data and the Global Human Settlement Layer for international data. The statistics are computed for
                    a variety of regions in the United States and abroad. The goal of this project is to provide a
                    resource for people to learn about the places they live, and to provide a resource for journalists
                    and researchers to find interesting statistics about places they are studying.
                </p>

                <p>
                    The project is open source, and the code is available on&nbsp;
                    <a href="https://github.com/kavigupta/urbanstats/">GitHub</a>
                    .
                    Feel free to file an issue or pull request if you have any suggestions or find any bugs.
                </p>

                <p>
                    The project is primarily developed by Kavi Gupta, a PhD student at MIT, and Luke Brody.
                    The primary contact for this project is urbanstats at kavigupta dot org.
                </p>
                <p>
                    Issues can be filed by emailing Kavi or by&nbsp;
                    <a href="https://github.com/kavigupta/urbanstats/issues">filing an issue on GitHub</a>
                    .
                </p>
            </div>
        </PageTemplate>
    )
}

function loadPage(): void {
    const root = ReactDOM.createRoot(document.getElementById('root')!)
    root.render(<AboutPanel />)
}

loadPage()
