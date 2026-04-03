import { MathJaxContext } from 'better-react-mathjax'
import React, { ReactNode, useContext, useEffect, useMemo } from 'react'
import { Footnotes, FootnotesProvider } from 'react-a11y-footnotes'

import './style.css'
import './common.css'
import { StringValidation } from 'zod'

import { getUnit } from './components/unit-display'
import { Navigator } from './navigation/Navigator'
import { urlFromPageDescriptor } from './navigation/PageDescriptor'
import { useColors } from './page_template/colors'
import { PageTemplate } from './page_template/template'
import { StandaloneEditor } from './urban-stats-script/StandaloneEditor'
import { ConstantCategory } from './urban-stats-script/documentation-category'
import { expressionOperatorMap } from './urban-stats-script/operators'
import { DocumentationTable, renderType, USSDocumentedType } from './urban-stats-script/types-values'
import { constantsDocumentationData } from './uss-documentation-routing'
import { assert } from './utils/defensive'
import { useHeaderTextClass } from './utils/responsive'

function useScrollToUssDocumentationFragment(hash: string | undefined, contentKey: string | undefined): void {
    useEffect(() => {
        if (hash === undefined || hash === '') {
            return
        }
        const fragment = hash.startsWith('#') ? hash.slice(1) : hash
        const id = decodeURIComponent(fragment)
        const scroll = (): void => {
            document.getElementById(id)?.scrollIntoView({ behavior: 'instant', block: 'start' })
        }
        requestAnimationFrame(() => {
            requestAnimationFrame(scroll)
        })
    }, [hash, contentKey])
}

type DocumentationSection = { kind: 'link', title: string, doc: ConstantCategory } | {
    kind: 'here'
    title: string
    content?: () => ReactNode
    subentries?: DocumentationSection[]
}

function documentationSection(sortedCategories: [ConstantCategory, [string, USSDocumentedType][]][]): DocumentationSection[] {
    return [
        {
            kind: 'here',
            title: 'Lists',
            content: () => (
                <>
                    <p>
                        The language also supports lists, which are denoted by square brackets. You can use operators on these as well:
                    </p>
                    <StandaloneEditor ident="lists" getCode={() => 'x = [1, 2, 3]' + '\n' + 'y = x + [4, 5, 6]' + '\n' + 'y'} />
                    <p>
                        For details on broadcasting, see the
                        {' '}
                        <a href="#broadcasting">broadcasting</a>
                        {' '}
                        section.
                    </p>
                </>
            ),

        },
        {
            kind: 'here',
            title: 'Objects',
            content: () => (
                <>
                    <p>
                        The language also supports objects, which are denoted by curly braces. You can use operators on these as well:
                    </p>
                    <StandaloneEditor ident="objects" getCode={() => 'x = {a: 1, b: 2}' + '\n' + 'y = x.a + x.b' + '\n' + 'y'} />
                </>
            ),
        },
        {
            kind: 'here',
            title: 'Opaque Types',
            content: () => (
                <>
                    <p>
                        USS has several opaque types, which are types that you can only interact with via functions.
                        For example, colors are opaque types, and you can only create them using functions like
                        {' '}
                        <code>rgb()</code>
                        {', '}
                        <code>hsv()</code>
                        , or one of the predefined colors.
                    </p>
                    <StandaloneEditor ident="opaque-types" getCode={() => 'x = rgb(0, 0, 1)' + '\n' + 'y = hsv(0, 1, 1)' + '\n' + '[x, y, colorRed]'} />
                    <p>
                        And you can only interact with them using functions like
                        {' '}
                        <code>renderColor()</code>
                        {' '}
                        or in other contexts that use color objects.
                    </p>
                    <StandaloneEditor ident="opaque-types" getCode={() => 'x = rgb(0, 0, 1)' + '\n' + 'y = hsv(0, 1, 1)' + '\n' + 'renderColor([x, y, colorRed])'} />

                </>
            ),
        },
        {
            kind: 'here',
            title: 'Regressions',
            content: () => (
                <>
                    <p>
                        USS supports linear regression via the
                        {' '}
                        <code>regress(y, x1, x2, ..., weight)</code>
                        {' '}
                        function, which returns an object with several properties:
                    </p>
                    <ul>
                        <li>
                            <code>b</code>
                            : The intercept of the regression line.
                        </li>
                        <li>
                            <code>m1, m2, m3...</code>
                            : The coefficients for each independent variable.
                        </li>
                        <li>
                            <code>r2</code>
                            : The R-squared value of the regression.
                        </li>
                        <li>
                            <code>residuals</code>
                            : The residuals of the regression.
                        </li>
                    </ul>
                    <p>
                        For example, to perform a regression of y on x1 and x2, with the last point weighted more heavily, you could do:
                    </p>
                    <StandaloneEditor
                        ident="regression"
                        getCode={
                            () =>
                                'x1 = [1, 2, 3, 4, 5]' + '\n'
                                + 'x2 = [2, 3, 2, 3, 2]' + '\n'
                                + 'y = [2.2, 2.8, 3.6, 4.5, 5.1]' + '\n'
                                + 'w = [1, 1, 1, 1, 10]' + '\n'
                                + 'model = regression(y=y, x1=x1, x2=x2, weight=w)' + '\n'
                                + 'model'
                        }
                    />
                    <p>
                        Note that the inputs are all named arguments and the weight is optional.
                    </p>
                </>
            ),
        },
        {
            kind: 'here',
            title: 'Aggregation',
            content: () => (
                <>
                    <p>
                        USS provides several functions for aggregating data, including mean, median, quantile, percentile,
                        min, max, sum, and more.
                    </p>
                    <p>
                        For example, to calculate the mean of a vector, you can do:
                    </p>
                    <StandaloneEditor ident="aggregation" getCode={() => 'mean([1, 2, 3, 4, 50])'} />
                    <p>
                        We can also weight the mean, for example:
                    </p>
                    <StandaloneEditor ident="aggregation" getCode={() => 'mean([1, 2, 3, 4, 50], weights=[1, 1, 1, 1, 10])'} />
                    <p>
                        The same works for median, quantile, and percentile.
                    </p>
                    <StandaloneEditor ident="aggregation" getCode={() => 'percentile([1, 2, 3, 4, 50], 10, weights=[1, 1, 1, 1, 10])'} />
                    <p>
                        On the other hand, min, max, and sum do not support weights.
                    </p>
                    <StandaloneEditor ident="aggregation" getCode={() => 'min([1, 2, 3, 4, 50])'} />
                </>
            ),
        },
        {
            kind: 'here',
            title: 'Broadcasting',
            content: () => (
                <>
                    <p>
                        Broadcasting is a feature of USS that allows you to operate on lists of values.
                    </p>
                </>
            ),
            subentries: [
                {
                    kind: 'here',
                    title: 'Forward Broadcasting',
                    content: () => (
                        <>
                            <p>
                                The main kind of broadcasting is
                                forward broadcasting, where you can apply operations to lists of elements. For example, if you have a list of numbers
                                and you want to add 1 to each of them, you can do:
                            </p>
                            <StandaloneEditor ident="broadcasting" getCode={() => 'x = [1, 2, 3]' + '\n' + 'y = x + 1' + '\n' + 'y'} />
                            <p>
                                This will result in a list of numbers, where each element is 1 greater than the corresponding element in the original list.
                            </p>
                            <p>
                                This also works with function calls, for example:
                            </p>
                            <StandaloneEditor ident="broadcasting-function" getCode={() => 'x = [1, 2, 3]' + '\n' + 'y = sin(x)' + '\n' + 'y'} />
                            <p>
                                Even when the list is of functions:
                            </p>
                            <StandaloneEditor ident="broadcasting-function-list" getCode={() => 'x = [sin, cos, tan]' + '\n' + 'y = x(pi)' + '\n' + 'y'} />
                            <p>
                                You can also apply broadcasting to objects, for example:
                            </p>
                            <StandaloneEditor ident="broadcasting-object" getCode={() => 'x = [{a: 1, b: 2}, {a: 3, b: 4}, {a: 5, b: 6}]' + '\n' + 'y = x.a' + '\n' + 'y'} />
                            <p>
                                And even assigning to a property:
                            </p>
                            <StandaloneEditor ident="broadcasting-object-property" getCode={() => 'x = [{a: 1, b: 2}, {a: 3, b: 4}, {a: 5, b: 6}]' + '\n' + 'x.a = [10, 20, 30]' + '\n' + 'x'} />
                        </>
                    ),
                },
                {
                    kind: 'here',
                    title: 'Split Broadcasting',
                    content: () => (
                        <>
                            There is also split broadcasting, which is what happens when you use an if statement.
                            For example, in the following code, the if statement is split into two branches, one for when y is greater than 65 and one for when it is not.
                            <StandaloneEditor ident="broadcasting" getCode={() => 'x = [1, 2, 3]' + '\n' + 'y = [50, 61, 70]' + '\n' + 'if (y > 65) { x = x * 10 } else { x = x + 1 }' + '\n' + 'x'} />
                            <p>
                                The if statement is split into two branches, one for when y is greater than 65 and one for when it is not.
                            </p>
                            <p>
                                Keep in mind that this is exactly two cases, rather than one for each element. Using mean() reveals this:
                            </p>
                            <StandaloneEditor ident="broadcasting" getCode={() => 'x = [1, 2, 3]' + '\n' + 'y = [50, 61, 70]' + '\n' + 'if (y > 65) { x = mean(x) } else { x = mean(x) }' + '\n' + 'x'} />
                        </>
                    ),
                },
            ],
        },
        {
            kind: 'here',
            title: 'All Operators',
            content: () => (
                <>
                    <p>
                        The following is a list of all operators that are available in USS.
                    </p>
                    <OperatorTable />
                </>
            ),
        },
        {
            kind: 'here',
            title: 'Constants and Functions',
            content: () => (
                <p>
                    USS provides several built-in constants and functions for mathematical operations,
                    data visualization, and data analysis. Each category has its own page; use the links
                    below or the previous/next arrows on each page to browse.
                </p>
            ),
            subentries: sortedCategories.map(([category]) => ({
                kind: 'link',
                title: getCategoryTitle(category),
                doc: category,
            })) satisfies DocumentationSection[],
        },
    ]
}

function TableOfContentsForSection(props: { section: DocumentationSection }): ReactNode {
    if (props.section.kind === 'link') {
        return <TOCLinkToCategory category={props.section.doc} />
    }
    const mainEntry = <TOCEntry href={`#${props.section.title.toLowerCase().replace(/\s+/g, '-')}`} title={props.section.title} />
    const ul = props.section.subentries && props.section.subentries.length > 0
        ? (
                <ul style={{ listStyleType: 'none', paddingLeft: '20px' }}>
                    {props.section.subentries.map((subentry, index) => (
                        <li key={index} style={{ marginBottom: '4px' }}>
                            <TableOfContentsForSection section={subentry} />
                        </li>
                    ))}
                </ul>
            )
        : null
    return (
        <>
            {mainEntry}
            {ul}
        </>
    )
}

function TableOfContents(props: { sortedCategories: [ConstantCategory, [string, USSDocumentedType][]][] }): ReactNode {
    const colors = useColors()
    const section = useMemo(() => documentationSection(props.sortedCategories), [props.sortedCategories])
    return (
        <div style={{
            margin: '20px 0',
            padding: '20px',
            backgroundColor: colors.slightlyDifferentBackground,
            borderRadius: '8px',
            border: `1px solid ${colors.borderNonShadow}`,
        }}
        >
            <h2 style={{ marginTop: 0, marginBottom: '15px', fontWeight: 'normal' }}>Table of Contents</h2>
            <ul style={{ listStyleType: 'none', paddingLeft: '0', margin: 0 }}>
                {section.map((subentry, index) => (
                    <TableOfContentsForSection key={index} section={subentry} />
                ))}
            </ul>
        </div>
    )
}

function TOCEntry({ href, title }: { href: string, title: string }): ReactNode {
    const colors = useColors()
    return (
        <li style={{ marginBottom: '8px' }}>
            <a href={href} style={{ color: colors.blueLink, textDecoration: 'none' }}>{title}</a>
        </li>
    )
}

function TOCLinkToCategory(props: { category: ConstantCategory }): ReactNode {
    const nav = useContext(Navigator.Context)
    const colors = useColors()
    return (
        <a
            style={{ color: colors.blueLink, fontSize: '0.9em', textDecoration: 'none' }}
            {...nav.link(
                { kind: 'ussDocumentation', doc: props.category },
                { scroll: { kind: 'position', top: 0 } },
            )}
        >
            {getCategoryTitle(props.category)}
        </a>
    )
}

function Subsection(props: { section: DocumentationSection, nesting: number }): ReactNode {
    if (props.section.kind === 'link') {
        return <TOCLinkToCategory category={props.section.doc} />
    }
    const headerTag = `h${Math.min(6, props.nesting + 2)}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
    return (
        <Header title={props.section.title} header={headerTag} ident={props.section.title.toLowerCase().replace(/\s+/g, '-')}>
            {props.section.content?.()}
            {props.section.subentries?.map((subentry, index) => (
                <Subsection key={index} section={subentry} nesting={props.nesting + 1} />
            ))}
        </Header>
    )
}

export function USSDocumentationPanel(props: { doc?: ConstantCategory, hash?: string }): ReactNode {
    const { doc, hash } = props
    const textHeaderClass = useHeaderTextClass()
    const docData = constantsDocumentationData()

    const section = useMemo(() => documentationSection(docData.sortedCategories), [docData.sortedCategories])
    useScrollToUssDocumentationFragment(hash, doc)

    if (doc !== undefined) {
        return (
            <MathJaxContext>
                <PageTemplate>
                    <FootnotesProvider>
                        <ConstantsCategoryPageView
                            category={doc}
                            sortedCategories={docData.sortedCategories}
                            textHeaderClass={textHeaderClass}
                        />
                        <Footnotes />
                    </FootnotesProvider>
                </PageTemplate>
            </MathJaxContext>
        )
    }

    return (
        <MathJaxContext>
            <PageTemplate>
                <FootnotesProvider>
                    <div className="serif">
                        <div className={textHeaderClass}>USS Documentation</div>

                        <TableOfContents sortedCategories={docData.sortedCategories} />

                        <Header title="Urban Stats Script (USS)" header="h1" ident="uss-title">
                            <p>
                                Urban Stats Script (USS) is a scripting language for describing operations on
                                data. It is designed to allow users to describe programs as if they refer to a
                                single row of data, while simultaneously allowing global operations like regression.
                            </p>
                            <p>
                                The basic syntax of USS should be familiar to any programmer. Arithmetic operations are
                                written as you would expect. Feel free to edit the code below to see how the result changes:
                            </p>
                            <StandaloneEditor ident="aritmetic" getCode={() => 'x = 2 ** 3 + 3 * 4' + '\n' + 'y = x + 2' + '\n' + 'y'} />
                            <p>
                                A full list of operators is available
                                {' '}
                                <a href="#all-operators">here</a>
                                .
                            </p>
                            <Subsection section={section[0]} nesting={0} />
                            <Subsection section={section[1]} nesting={0} />
                            <Subsection section={section[2]} nesting={0} />
                            <Subsection section={section[3]} nesting={0} />
                            <Subsection section={section[4]} nesting={0} />
                            <Subsection section={section[5]} nesting={0} />
                            <Subsection section={section[6]} nesting={0} />
                            <Subsection section={section[7]} nesting={0} />
                        </Header>
                    </div>
                    <Footnotes />
                </FootnotesProvider>
            </PageTemplate>
        </MathJaxContext>
    )
}

function createTable(colors: ReturnType<typeof useColors>, headers: string[], cells: { id?: string, row: ReactNode[] }[]): ReactNode {
    const tableStyles = {
        table: {
            width: '100%',
            borderCollapse: 'collapse' as const,
            margin: '20px 0',
            fontSize: '14px',
            color: colors.textMain,
        },
        header: {
            border: `1px solid ${colors.borderNonShadow}`,
            padding: '12px',
            textAlign: 'left' as const,
            verticalAlign: 'top' as const,
            backgroundColor: colors.background,
            fontWeight: 'bold' as const,
        },
        cell: {
            border: `1px solid ${colors.borderNonShadow}`,
            padding: '12px',
            textAlign: 'left' as const,
            verticalAlign: 'top' as const,
        },
        code: {
            backgroundColor: colors.slightlyDifferentBackground,
            padding: '2px 4px',
            borderRadius: '3px',
            fontFamily: '\'Courier New\', monospace',
            fontSize: '13px',
        },
        rowColors: {
            even: colors.slightlyDifferentBackground,
            odd: colors.background,
        },
    }

    return (
        <table style={tableStyles.table}>
            <thead>
                <tr>
                    {headers.map((header, index) => (
                        <th key={index} style={tableStyles.header}>
                            {header}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {cells.map(({ row, id }, rowIndex) => (
                    <tr
                        id={id}
                        key={rowIndex}
                        style={{
                            backgroundColor: rowIndex % 2 === 0 ? tableStyles.rowColors.even : tableStyles.rowColors.odd,
                        }}
                    >
                        {row.map((cell, cellIndex) => (
                            <td key={cellIndex} style={tableStyles.cell}>
                                {cell}
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    )
}

function OperatorTable(): ReactNode {
    const colors = useColors()

    const headers = ['Operator', 'Type', 'Precedence', 'Description', 'Example']
    const cells = Array.from(expressionOperatorMap.entries()).map(([operator, info]) => ({
        row: [
            <code key="operator" style={{ backgroundColor: colors.slightlyDifferentBackground, padding: '2px 4px', borderRadius: '3px', fontFamily: '\'Courier New\', monospace', fontSize: '13px' }}>
                {operator}
            </code>,
            info.unary && info.binary
                ? 'Unary/Binary'
                : info.unary
                    ? 'Unary'
                    : info.binary
                        ? 'Binary'
                        : 'Unknown',
            info.precedence,
            info.description,
            info.examples.map((example, exampleIndex) => (
                <span key={exampleIndex}>
                    <code style={{ backgroundColor: colors.slightlyDifferentBackground, padding: '2px 4px', borderRadius: '3px', fontFamily: '\'Courier New\', monospace', fontSize: '13px' }}>
                        {example}
                    </code>
                    {exampleIndex < info.examples.length - 1 && ', '}
                </span>
            )),
        ],
    }))

    return createTable(colors, headers, cells)
}

// function ConstantsAndFunctionsIndex(props: { sortedCategories: [ConstantCategory, [string, USSDocumentedType][]][] }): ReactNode {
//     const nav = useContext(Navigator.Context)
//     const colors = useColors()
//     return (
//         <ul style={{ marginLeft: '20px', marginTop: '12px' }}>
//             {props.sortedCategories.map(([category]) => (
//                 <li key={category} style={{ marginBottom: '8px' }}>
//                     <a
//                         style={{ color: colors.textMain }}
//                         {...nav.link(
//                             { kind: 'ussDocumentation', doc: category },
//                             { scroll: { kind: 'position', top: 0 } },
//                         )}
//                     >
//                         {getCategoryTitle(category)}
//                     </a>
//                 </li>
//             ))}
//         </ul>
//     )
// }

function ConstantsCategoryPageView(props: {
    category: ConstantCategory
    sortedCategories: [ConstantCategory, [string, USSDocumentedType][]][]
    textHeaderClass: string
}): ReactNode {
    const nav = useContext(Navigator.Context)
    const colors = useColors()
    const entry = props.sortedCategories.find(([c]) => c === props.category)
    assert(entry !== undefined, 'Category not found in documentation data')
    const constants = entry[1]

    const categorySlugs = props.sortedCategories.map(([c]) => c)
    const idx = categorySlugs.indexOf(props.category)
    const prevCategory = idx > 0 ? categorySlugs[idx - 1] : null
    const nextCategory = idx >= 0 && idx < categorySlugs.length - 1 ? categorySlugs[idx + 1] : null

    const navRowStyle: React.CSSProperties = {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        marginTop: '28px',
        paddingTop: '20px',
        borderTop: `1px solid ${colors.borderNonShadow}`,
    }

    const disabledArrowStyle: React.CSSProperties = {
        color: colors.textMain,
        opacity: 0.4,
        userSelect: 'none',
    }

    return (
        <div className="serif uss-documentation">
            <div className={props.textHeaderClass}>USS Documentation</div>
            <p style={{ marginTop: '8px', marginBottom: '20px' }}>
                <a
                    style={{ color: colors.textMain, cursor: 'pointer' }}
                    {...nav.link({ kind: 'ussDocumentation' }, { scroll: { kind: 'position', top: 0 } })}
                    onClick={(e) => {
                        if (e.button === 0 && !e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
                            e.preventDefault()
                            window.history.back()
                        }
                    }}
                >
                    ← Back to full documentation
                </a>
            </p>
            <h2 style={{ marginBottom: '12px' }}>
                {getCategoryTitle(props.category)}
            </h2>
            <DocumentationForCategory category={props.category} constants={constants} />
            <nav aria-label="Constants and functions pages" style={navRowStyle}>
                <div>
                    {prevCategory !== null
                        ? (
                                <a
                                    style={{ color: colors.textMain }}
                                    {...nav.link(
                                        { kind: 'ussDocumentation', doc: prevCategory },
                                        { scroll: { kind: 'position', top: 0 } },
                                    )}
                                >
                                    ←
                                    {' '}
                                    {getCategoryTitle(prevCategory)}
                                </a>
                            )
                        : <span style={disabledArrowStyle}>←</span>}
                </div>
                <div>
                    {nextCategory !== null
                        ? (
                                <a
                                    style={{ color: colors.textMain }}
                                    {...nav.link(
                                        { kind: 'ussDocumentation', doc: nextCategory },
                                        { scroll: { kind: 'position', top: 0 } },
                                    )}
                                >
                                    {getCategoryTitle(nextCategory)}
                                    {' '}
                                    →
                                </a>
                            )
                        : <span style={disabledArrowStyle}>→</span>}
                </div>
            </nav>
        </div>
    )
}

function DocumentationForCategory(props: { category: ConstantCategory, constants: [string, USSDocumentedType][] }): ReactNode {
    const withoutTable: [string, USSDocumentedType][] = []
    const categoryTables = new Map<DocumentationTable, [string, USSDocumentedType][]>()
    for (const [name, value] of props.constants) {
        const tableName = value.documentation?.documentationTable
        if (tableName !== undefined) {
            let cat = categoryTables.get(tableName)
            if (cat === undefined) {
                cat = []
                categoryTables.set(tableName, cat)
            }
            cat.push([name, value])
        }
        else {
            withoutTable.push([name, value])
        }
    }

    return (
        <>
            <p style={{ marginLeft: '20px' }}>{getCategoryDescription(props.category)}</p>
            {withoutTable.map(([name, value]) => (
                <LongFormDocumentation key={name} name={name} value={value} />
            ))}

            {/* Add tables for constants with documentationTable */}
            {(() => {
                return Array.from(categoryTables.entries()).map(([tableName, tableConstants]) =>
                    <ShortFormTableDocumentation key={tableName} tableName={tableName} tableConstants={tableConstants} />,
                )
            })()}
        </>
    )
}

export function LongFormDocumentation(props: { name: string, value: USSDocumentedType }): ReactNode {
    const colors = useColors()
    return (
        <Header key={props.name} title={props.name} header="h4" ident={props.name} docQuery={props.value.documentation!.category}>
            <div style={{ marginBottom: '20px', marginLeft: '20px' }}>
                <div style={{ marginBottom: '10px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div>
                        Type:
                        <code style={{
                            backgroundColor: colors.slightlyDifferentBackground,
                            padding: '4px 8px',
                            borderRadius: '3px',
                            fontFamily: '\'Courier New\', monospace',
                            fontSize: '13px',
                            marginLeft: '10px',
                        }}
                        >
                            {renderType(props.value.type)}
                        </code>
                    </div>
                    {props.value.documentation?.unit !== undefined && (
                        <div style={{ color: colors.textMain }}>
                            <strong>Unit:</strong>
                            {' '}
                            {getUnit(props.value.documentation.unit)}
                        </div>
                    )}
                </div>
                <div style={{ marginBottom: '10px' }}>
                    {props.value.documentation?.longDescription ?? 'No description available.'}
                </div>
                {props.value.documentation?.namedArgs && Object.keys(props.value.documentation.namedArgs).length > 0 && (
                    <div style={{ marginBottom: '10px' }}>
                        <strong>Named Arguments:</strong>
                        <ul style={{ margin: '5px 0 0 20px' }}>
                            {Object.entries(props.value.documentation.namedArgs).map(([argName, argDesc]) => (
                                <li key={argName}>
                                    <code style={{
                                        backgroundColor: colors.slightlyDifferentBackground,
                                        padding: '2px 4px',
                                        borderRadius: '3px',
                                        fontFamily: '\'Courier New\', monospace',
                                        fontSize: '12px',
                                    }}
                                    >
                                        {argName}
                                    </code>
                                    :
                                    {' '}
                                    {argDesc}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                {props.value.documentation?.isDefault && (
                    <div
                        style={{
                            marginBottom: '10px',
                            color: colors.textMain,
                            fontStyle: 'italic',
                        }}
                    >
                        Default value for this type
                    </div>
                )}
            </div>
        </Header>
    )
}

function ShortFormTableDocumentation(props: { tableName: DocumentationTable, tableConstants: [string, USSDocumentedType][] }): ReactNode {
    const colors = useColors()
    const headers = ['Name', 'Type', 'Description']
    const cells = props.tableConstants.map(([name, value]) => ({
        id: name,
        row: [
            <span key="name" style={{ fontFamily: '\'Courier New\', monospace' }}>{name}</span>,
            <code
                key="type"
                style={{
                    backgroundColor: colors.slightlyDifferentBackground,
                    padding: '2px 4px',
                    borderRadius: '3px',
                    fontFamily: '\'Courier New\', monospace',
                    fontSize: '12px',
                }}
            >
                {renderType(value.type)}
            </code>,
            <span key="description">
                {value.documentation?.longDescription ?? 'No description available.'}
                {value.documentation?.isDefault && (
                    <span key="default-indicator" style={{ fontStyle: 'italic', color: colors.textMain }}>
                        {' '}
                        (default)
                    </span>
                )}
            </span>,
        ],
    }))

    return (
        <div key={props.tableName} style={{ marginTop: '20px', marginLeft: '20px' }}>
            <h4 style={{ marginBottom: '15px' }}>{getTableTitle(props.tableName)}</h4>
            <p style={{ marginBottom: '15px' }}>{getTableDescription(props.tableName)}</p>
            {createTable(colors, headers, cells)}
        </div>
    )
}

function getCategoryTitle(category: ConstantCategory): string {
    switch (category) {
        case 'logic':
            return 'Logic and Control'
        case 'math':
            return 'Mathematical Functions'
        case 'color':
            return 'Color Functions'
        case 'unit':
            return 'Unit Types'
        case 'map':
            return 'Map and Visualization'
        case 'scale':
            return 'Scaling Functions'
        case 'ramp':
            return 'Color Ramps'
        case 'inset':
            return 'Map Insets'
        case 'regression':
            return 'Statistical Analysis'
        case 'basic':
            return 'Basic Functions'
        case 'mapper':
            return 'Mapper Data Variables'
        case 'richText':
            return 'Rich Text Formatting'
    }
}

function getCategoryDescription(category: ConstantCategory): string {
    switch (category) {
        case 'logic':
            return 'Boolean values and control flow constants.'
        case 'math':
            return 'Mathematical functions for arithmetic, trigonometry, and statistical operations.'
        case 'color':
            return 'Functions for creating and manipulating colors using RGB, HSV, and predefined color palettes.'
        case 'unit':
            return 'Unit type constants for specifying measurement units in data visualization.'
        case 'map':
            return 'Functions for creating choropleth maps, point maps, and map styling.'
        case 'scale':
            return 'Functions for scaling numeric data to visualization ranges.'
        case 'ramp':
            return 'Functions for creating and manipulating color ramps for data visualization.'
        case 'inset':
            return 'Functions for creating map insets and managing multiple map views.'
        case 'regression':
            return 'Statistical analysis functions for linear regression.'
        case 'basic':
            return 'Basic utility functions for type conversion and common operations.'
        case 'mapper':
            return 'The mapper provides several variables relevant to the current universe and set of geographic features.'
        case 'richText':
            return 'Functions for rich text formatting.'
    }
}

function getTableTitle(tableName: DocumentationTable): string {
    switch (tableName) {
        case 'predefined-colors':
            return 'Predefined Color Constants'
        case 'unit-types':
            return 'Unit Type Constants'
        case 'predefined-ramps':
            return 'Predefined Color Ramps'
        case 'predefined-insets':
            return 'Predefined Map Insets'
        case 'logarithm-functions':
            return 'Logarithm Functions'
        case 'trigonometric-functions':
            return 'Trigonometric Functions'
        case 'mapper-data-variables':
            return 'Mapper Data Variables'
    }
}

function getTableDescription(tableName: DocumentationTable): string {
    switch (tableName) {
        case 'predefined-colors':
            return 'Built-in color constants for common colors like red, blue, green, etc. Each color can be used directly in USS expressions.'
        case 'unit-types':
            return 'Unit type constants for specifying measurement units in data visualization and analysis.'
        case 'predefined-ramps':
            return 'Predefined color ramps for mapping numeric values to colors in data visualizations.'
        case 'predefined-insets':
            return 'Predefined map inset configurations for common geographic regions and territories.'
        case 'logarithm-functions':
            return 'Mathematical functions for computing logarithms with different bases (natural, base-10, base-2).'
        case 'trigonometric-functions':
            return 'Mathematical functions for trigonometric calculations (sine, cosine, arccosine, etc.).'
        case 'mapper-data-variables':
            return 'Variables used in the mapper.'
    }
}

function Header(props: {
    title: string
    header: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
    ident: string
    docQuery?: ConstantCategory
    children: ReactNode
}): ReactNode {
    const linkKind = useContext(linkContext)

    return (
        <>
            <props.header id={props.ident}>
                {linkKind === 'link' && props.docQuery !== undefined
                    ? (
                            <a
                                href={urlFromPageDescriptor({
                                    kind: 'ussDocumentation',
                                    doc: props.docQuery,
                                    hash: `#${encodeURIComponent(props.ident)}`,
                                }).toString()}
                                target="_blank"
                                rel="noreferrer"
                            >
                                {props.title}
                            </a>
                        )
                    : props.title}
            </props.header>
            {props.children}
        </>
    )
}

export const linkContext = React.createContext<'reference' | 'link'>('reference')
