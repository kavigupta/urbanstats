import { MathJaxContext } from 'better-react-mathjax'
import React, { ReactNode } from 'react'
import { Footnotes, FootnotesProvider } from 'react-a11y-footnotes'

import './style.css'
import './common.css'
import { PageTemplate } from './page_template/template'
import { EditorWithResult } from './urban-stats-script/EditorPanel'
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
                            The Urban Stats Script (USS) is a scripting language for describing operations on
                            data. It is designed to allow users to describe programs as if they refer to a
                            single row of data, while simultaneously allowing global operations like regression.
                        </p>

                        <h2>Syntax</h2>
                        <p>
                            The basic syntax of USS should be familiar to any programmer. Arithmetic operations are
                            written as you would expect. Feel free to edit the code below to see how the result changes:
                        </p>
                        <EditorWithResult ident="aritmetic" getCode={() => 'x = 2 ** 3 + 3 * 4' + '\n' + 'y = x + 2' + '\n' + 'y'} />
                    </div>
                    <Footnotes />
                </FootnotesProvider>
            </PageTemplate>
        </MathJaxContext>
    )
}
