import { MathJaxContext } from 'better-react-mathjax'
import React, { ReactNode, useState } from 'react'
import { Footnotes, FootnotesProvider } from 'react-a11y-footnotes'

import './style.css'
import './common.css'
import { defaultTypeEnvironment } from './mapper/context'
import { useColors } from './page_template/colors'
import { PageTemplate } from './page_template/template'
import { Universe } from './universe'
import { StandaloneEditor } from './urban-stats-script/StandaloneEditor'
import { defaultConstants } from './urban-stats-script/constants/constants'
import { expressionOperatorMap } from './urban-stats-script/operators'
import { constantCategories, ConstantCategory, renderType, USSDocumentedType } from './urban-stats-script/types-values'
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

function OperatorTable(): ReactNode {
    const colors = useColors()

    // Global style variables for the operator table
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
                    <th style={tableStyles.header}>
                        Operator
                    </th>
                    <th style={tableStyles.header}>
                        Type
                    </th>
                    <th style={tableStyles.header}>
                        Precedence
                    </th>
                    <th style={tableStyles.header}>
                        Description
                    </th>
                    <th style={tableStyles.header}>
                        Example
                    </th>
                </tr>
            </thead>
            <tbody>
                {Array.from(expressionOperatorMap.entries()).map(([operator, info], index) => (
                    <tr
                        key={operator}
                        style={{
                            backgroundColor: index % 2 === 0 ? tableStyles.rowColors.even : tableStyles.rowColors.odd,
                        }}
                    >
                        <td style={tableStyles.cell}>
                            <code style={tableStyles.code}>
                                {operator}
                            </code>
                        </td>
                        <td style={tableStyles.cell}>
                            {info.unary && info.binary
                                ? 'Unary/Binary'
                                : info.unary
                                    ? 'Unary'
                                    : info.binary
                                        ? 'Binary'
                                        : 'Unknown'}
                        </td>
                        <td style={tableStyles.cell}>
                            {info.precedence}
                        </td>
                        <td style={tableStyles.cell}>
                            {info.description}
                        </td>
                        <td style={tableStyles.cell}>
                            {info.examples.map((example, exampleIndex) => (
                                <span key={exampleIndex}>
                                    <code style={tableStyles.code}>
                                        {example}
                                    </code>
                                    {exampleIndex < info.examples.length - 1 && ', '}
                                </span>
                            ))}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    )
}

function ConstantsDocumentation(): ReactNode {
    const colors = useColors()
    const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set(constantCategories))

    const mapperContext = defaultTypeEnvironment('world')

    // Group constants by category
    const constantsByCategory = new Map<ConstantCategory, [string, USSDocumentedType][]>()

    // Add default constants
    for (const [name, value] of defaultConstants) {
        const category = value.documentation?.category
        assert(category !== undefined, `Constant ${name} does not have a category defined.`)
        if (!constantsByCategory.has(category)) {
            constantsByCategory.set(category, [])
        }
        constantsByCategory.get(category)!.push([name, value])
    }

    // Add mapper context elements
    for (const [name, value] of mapperContext) {
        // Skip if already added from default constants
        if (defaultConstants.has(name)) continue

        const category = value.documentation?.category
        assert(category !== undefined, `Constant ${name} does not have a category defined.`)
        if (constantCategories.includes(category)) {
            if (!constantsByCategory.has(category)) {
                constantsByCategory.set(category, [])
            }
            constantsByCategory.get(category)!.push([name, value])
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
                                {isCollapsed ? '▶' : '▼'}
                            </span>
                            <h3 id={`constants-${category}`} style={{ margin: 0 }}>
                                {getCategoryTitle(category)}
                            </h3>
                        </div>
                        {!isCollapsed && (
                            <>
                                <p style={{ marginLeft: '20px' }}>{getCategoryDescription(category)}</p>
                                {constants.map(([name, value]) => (
                                    <Header key={name} title={name} header="h4" ident={`constant-${name}`}>
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
                                                    {renderType(value.type)}
                                                </code>
                                            </div>
                                            <div style={{ marginBottom: '10px' }}>
                                                {value.documentation?.longDescription ?? 'No description available.'}
                                            </div>
                                            {value.documentation?.namedArgs && Object.keys(value.documentation.namedArgs).length > 0 && (
                                                <div style={{ marginBottom: '10px' }}>
                                                    <strong>Named Arguments:</strong>
                                                    <ul style={{ margin: '5px 0 0 20px' }}>
                                                        {Object.entries(value.documentation.namedArgs).map(([argName, argDesc]) => (
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
                                            {value.documentation?.isDefault && (
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
                                ))}
                            </>
                        )}
                    </div>
                )
            })}
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
