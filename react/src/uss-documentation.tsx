import { MathJaxContext } from 'better-react-mathjax'
import React, { ReactNode } from 'react'
import { Footnotes, FootnotesProvider } from 'react-a11y-footnotes'

import './style.css'
import './common.css'
import { useColors } from './page_template/colors'
import { PageTemplate } from './page_template/template'
import { StandaloneEditor } from './urban-stats-script/StandaloneEditor'
import { expressionOperatorMap } from './urban-stats-script/operators'
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
                            <Header title="Syntax" header="h2" ident="syntax">
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
                                <Header title="Lists" header="h3" ident="lists">
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
                                <Header title="Objects" header="h3" ident="objects">
                                    <p>
                                        The language also supports objects, which are denoted by curly braces. You can use operators on these as well:
                                    </p>
                                    <StandaloneEditor ident="objects" getCode={() => 'x = {a: 1, b: 2}' + '\n' + 'y = x.a + x.b' + '\n' + 'y'} />
                                </Header>
                            </Header>
                            <Header title="Semantics" header="h2" ident="semantics">
                                <Header title="Broadcasting" header="h3" ident="broadcasting">
                                    <p>
                                        Broadcasting is a feature of USS that allows you to operate on lists of values.
                                    </p>
                                </Header>
                                <Header title="Forward Broadcasting" header="h4" ident="forward-broadcasting">
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
                                        <StandaloneEditor ident="broadcasting-function" getCode={() => 'x = [1, 2, 3]' + '\n' + 'y = sin(x)' + '\n' + 'y'} />
                                    </p>
                                    <p>
                                        Even when the list is of functions:
                                        <StandaloneEditor ident="broadcasting-function-list" getCode={() => 'x = [sin, cos, tan]' + '\n' + 'y = x(pi)' + '\n' + 'y'} />
                                    </p>
                                    <p>
                                        You can also apply broadcasting to objects, for example:
                                        <StandaloneEditor ident="broadcasting-object" getCode={() => 'x = [{a: 1, b: 2}, {a: 3, b: 4}, {a: 5, b: 6}]' + '\n' + 'y = x.a' + '\n' + 'y'} />
                                    </p>
                                    <p>
                                        And even assigning to a property:
                                        <StandaloneEditor ident="broadcasting-object-property" getCode={() => 'x = [{a: 1, b: 2}, {a: 3, b: 4}, {a: 5, b: 6}]' + '\n' + 'x.a = [10, 20, 30]' + '\n' + 'x'} />
                                    </p>
                                </Header>
                                <Header title="Split Broadcasting" header="h4" ident="backward-broadcasting">
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
                                <Header title="All Operators" header="h2" ident="all-operators">
                                    <p>
                                        The following is a list of all operators that are available in USS.
                                    </p>
                                    <OperatorTable />
                                </Header>
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
