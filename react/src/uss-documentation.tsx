import { MathJaxContext } from 'better-react-mathjax'
import React, { ReactNode, useState } from 'react'
import { Footnotes, FootnotesProvider } from 'react-a11y-footnotes'

import './style.css'
import './common.css'
import { defaultTypeEnvironment } from './mapper/context'
import { useColors } from './page_template/colors'
import { PageTemplate } from './page_template/template'
import { StandaloneEditor } from './urban-stats-script/StandaloneEditor'
import { defaultConstants } from './urban-stats-script/constants/constants'
import { expressionOperatorMap } from './urban-stats-script/operators'
import { constantCategories, ConstantCategory, DocumentationTable, renderType, USSDocumentedType, USSValue } from './urban-stats-script/types-values'
import { assert } from './utils/defensive'
import { useHeaderTextClass } from './utils/responsive'

export function USSDocumentationPanel(): ReactNode {
    const textHeaderClass = useHeaderTextClass()

    return (
        <MathJaxContext>
            <PageTemplate>
                <FootnotesProvider>
                    <div className="serif">
                        <div className={textHeaderClass}>USS Documentation</div>

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
                            <Header title="Lists" header="h2" ident="lists">
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
                            </Header>
                            <Header title="Objects" header="h2" ident="objects">
                                <p>
                                    The language also supports objects, which are denoted by curly braces. You can use operators on these as well:
                                </p>
                                <StandaloneEditor ident="objects" getCode={() => 'x = {a: 1, b: 2}' + '\n' + 'y = x.a + x.b' + '\n' + 'y'} />
                            </Header>
                            <Header title="Broadcasting" header="h2" ident="broadcasting">
                                <p>
                                    Broadcasting is a feature of USS that allows you to operate on lists of values.
                                </p>
                                <Header title="Forward Broadcasting" header="h3" ident="forward-broadcasting">
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
                                </Header>
                                <Header title="Split Broadcasting" header="h3" ident="backward-broadcasting">
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
                                </Header>
                            </Header>
                            <Header title="Detailed Tables" header="h2" ident="detailed-tables">
                                <Header title="All Operators" header="h3" ident="all-operators">
                                    <p>
                                        The following is a list of all operators that are available in USS.
                                    </p>
                                    <OperatorTable />
                                </Header>
                            </Header>
                            <Header title="Constants and Functions" header="h2" ident="constants">
                                <p>
                                    USS provides several built-in constants and functions for mathematical operations,
                                    data visualization, and data analysis. These are organized by category below.
                                </p>
                                <ConstantsDocumentation />
                            </Header>
                        </Header>
                    </div>
                    <Footnotes />
                </FootnotesProvider>
            </PageTemplate>
        </MathJaxContext>
    )
}

function createTable(colors: ReturnType<typeof useColors>, headers: string[], cells: ReactNode[][]): ReactNode {
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
                {cells.map((row, rowIndex) => (
                    <tr
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
    const cells = Array.from(expressionOperatorMap.entries()).map(([operator, info]) => [
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
    ])

    return createTable(colors, headers, cells)
}

function ConstantsDocumentation(): ReactNode {
    const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set(constantCategories))

    const mapperContext = defaultTypeEnvironment('world')

    // Group constants by category
    const constantsByCategory = new Map<ConstantCategory, [string, USSDocumentedType][]>()

    // Add default constants
    for (const [name, value] of defaultConstants) {
        const category = value.documentation?.category
        assert(category !== undefined, `Constant ${name} does not have a category defined.`)
        let cat = constantsByCategory.get(category)
        if (cat === undefined) {
            cat = []
            constantsByCategory.set(category, cat)
        }
        cat.push([name, value])
    }

    // Add mapper context elements
    for (const [name, value] of mapperContext) {
        // Skip if already added from default constants
        if (defaultConstants.has(name)) continue

        const category = value.documentation?.category
        assert(category !== undefined, `Constant ${name} does not have a category defined.`)
        if (constantCategories.includes(category)) {
            let cat = constantsByCategory.get(category)
            if (cat === undefined) {
                cat = []
                constantsByCategory.set(category, cat)
            }
            cat.push([name, value])
        }
    }

    // Group constants by documentationTable for table display
    const constantsByTable = new Map<DocumentationTable, [string, USSValue][]>()
    for (const [name, value] of defaultConstants) {
        const tableName = value.documentation?.documentationTable
        if (tableName !== undefined) {
            let cat = constantsByTable.get(tableName)
            if (cat === undefined) {
                cat = []
                constantsByTable.set(tableName, cat)
            }
            cat.push([name, value])
        }
    }

    // Sort categories for consistent display
    const categoryOrder = constantCategories
    const sortedCategories = Array.from(constantsByCategory.entries()).sort((a, b) => {
        const aIndex = categoryOrder.indexOf(a[0])
        const bIndex = categoryOrder.indexOf(b[0])
        return aIndex - bIndex
    })

    const toggleCategory = (category: ConstantCategory): void => {
        setCollapsedCategories((prev) => {
            const newSet = new Set(prev)
            if (newSet.has(category)) {
                newSet.delete(category)
            }
            else {
                newSet.add(category)
            }
            return newSet
        })
    }

    return (
        <div>
            {sortedCategories.map(([category, constants]) => {
                const isCollapsed = collapsedCategories.has(category)
                return (
                    <div key={category}>
                        <div
                            style={{
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                marginBottom: '10px',
                            }}
                            onClick={() => { toggleCategory(category) }}
                        >
                            <span style={{
                                fontSize: '16px',
                                transition: 'transform 0.2s',
                                transform: isCollapsed ? 'rotate(0deg)' : 'rotate(90deg)',
                            }}
                            >
                                ▶
                            </span>
                            <h3 id={`constants-${category}`} style={{ margin: 0 }}>
                                {getCategoryTitle(category)}
                            </h3>
                        </div>
                        {!isCollapsed && (<DocumentationForCategory category={category} constants={constants} />)}
                    </div>
                )
            })}

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

function LongFormDocumentation(props: { name: string, value: USSDocumentedType }): ReactNode {
    const colors = useColors()
    return (
        <Header key={props.name} title={props.name} header="h4" ident={`constant-${props.name}`}>
            <div style={{ marginBottom: '20px', marginLeft: '20px' }}>
                <div style={{ marginBottom: '10px' }}>
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
    const cells = props.tableConstants.map(([name, value]) => [
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
    ])

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

function Header(props: { title: string, header: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6', ident: string, children: ReactNode }): ReactNode {
    return (
        <>
            <props.header id={props.ident}>
                {props.title}
            </props.header>
            {props.children}
        </>
    )
}
