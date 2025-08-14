import { MathJaxContext } from 'better-react-mathjax'
import React, { ReactNode } from 'react'
import { Footnotes, FootnotesProvider } from 'react-a11y-footnotes'

import './style.css'
import './common.css'
import { PageTemplate } from './page_template/template'
import { useHeaderTextClass } from './utils/responsive'

export function USSDocumentationPanel(): ReactNode {
    const textHeaderClass = useHeaderTextClass()

    return (
        <MathJaxContext>
            <PageTemplate>
                <FootnotesProvider>
                    <div className="serif">
                        <div className={textHeaderClass}>USS Documentation</div>

                        <h1>Urban Stats Script (USS)</h1>
                        <p>
                            This page contains documentation for the Urban Stats Script (USS) system.
                        </p>

                        {/* Content will be added here later */}

                    </div>
                    <Footnotes />
                </FootnotesProvider>
            </PageTemplate>
        </MathJaxContext>
    )
}
