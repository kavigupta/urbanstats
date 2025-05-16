import React, { CSSProperties, ReactNode, useContext, useLayoutEffect } from 'react'
import { ZodError } from 'zod'

import { AboutPanel } from '../components/AboutPanel'
import { IndexPanel } from '../components/IndexPanel'
import { useColors } from '../page_template/colors'
import { PageTemplate } from '../page_template/template'

import { Navigator } from './Navigator'
import { PageData, pageTitle, urlFromPageDescriptor } from './PageDescriptor'
import { InitialLoad, SubsequentLoad } from './loading'

export function Router(): ReactNode {
    const navigator = useContext(Navigator.Context)
    const pageState = navigator.usePageState()

    useLayoutEffect(() => {
        // Execute the navigator's effects
        navigator.effects.forEach((effect) => { effect() })
        navigator.effects = []

        // eslint-disable-next-line no-restricted-syntax -- This is the one place in the app where we set the doc title
        document.title = pageTitle(pageState.current.data)
    })

    return (
        <>
            <input type="hidden" id="pageState_kind" value={pageState.kind} />
            <input type="hidden" id="pageState_current_descriptor_kind" value={pageState.current.descriptor.kind} />
            <PageRouter pageData={pageState.current.data} />
            <SubsequentLoad />
            <HighlightHash />
        </>
    )
}

function HighlightHash(): ReactNode {
    const navigator = useContext(Navigator.Context)
    const pageState = navigator.usePageState()
    const hash = urlFromPageDescriptor(pageState.current.descriptor).hash
    return hash !== ''
        ? (
                <style>
                    {`${hash} {
background-color: var(--highlight);
}`}
                </style>
            )
        : null
}

function ErrorScreen({ data }: { data: Extract<PageData, { kind: 'error' }> }): ReactNode {
    const errorContents = data.descriptor === undefined ? <NotFoundError {...data} /> : <PageLoadError {...data} />

    const colors = useColors()
    const errorBoxStyle: CSSProperties = {
        backgroundColor: colors.slightlyDifferentBackgroundFocused,
        borderRadius: '5px',
        textAlign: 'center',
        padding: '10px',
    }

    return (
        <PageTemplate>
            <div style={errorBoxStyle}>
                {errorContents}
            </div>
        </PageTemplate>
    )
}

function NotFoundError({ url, error }: { url: URL, error: unknown }): ReactNode {
    return (
        <>
            <h1>
                Not Found
            </h1>
            <p>
                Urban Stats couldn&apos;t navigate to the URL
                <br />
                <code>{url.toString()}</code>
            </p>
            <p>
                While trying to understand the URL, Urban Stats encountered the following errors:
                <br />
                <FormatNavigationError error={error} />
            </p>
            <p>
                Check that the URL is correct.
            </p>
        </>
    )
}

function FormatNavigationError({ error }: { error: unknown }): ReactNode {
    if (error instanceof ZodError) {
        let key = 0
        return Object.values(error.flatten((issue) => {
            key++
            return (
                <li key={key}>
                    Parameter
                    {' '}
                    <code>{issue.path}</code>
                    {' '}
                    is
                    {' '}
                    {issue.message}
                </li>
            )
        }).fieldErrors)
    }
    return (
        <code>
            {String(error)}
        </code>
    )
}

function PageLoadError({ url, error }: { url: URL, error: unknown }): ReactNode {
    return (
        <>
            <h1>
                Error Loading Page
            </h1>
            <p>
                Urban Stats couldn&apos;t load the page at URL
                <br />
                <code>{url.toString()}</code>
            </p>
            <p>
                Urban Stats encountered the following error:
                <br />
                <code>{String(error)}</code>
            </p>
            <p>
                Check that you are connected to the internet, and that the URL is correct.
            </p>
        </>
    )
}

function PageRouter({ pageData }: { pageData: PageData }): ReactNode {
    switch (pageData.kind) {
        case 'article':
            return (
                <pageData.articlePanel article={pageData.article} rows={pageData.rows} />
            )
        case 'comparison':
            return (
                <pageData.comparisonPanel articles={pageData.articles} universes={pageData.universes} rows={pageData.rows} />
            )
        case 'statistic':
            return (
                <pageData.statisticPanel
                    {...pageData}
                />
            )
        case 'index':
            return <IndexPanel />
        case 'about':
            return <AboutPanel />
        case 'dataCredit':
            return <pageData.dataCreditPanel />
        case 'quiz':
            return (
                <pageData.quizPanel
                    quizDescriptor={pageData.quizDescriptor}
                    todayName={pageData.todayName}
                    todaysQuiz={pageData.quiz}
                />
            )
        case 'syau':
            return <pageData.syauPanel typ={pageData.typ} universe={pageData.universe} counts={pageData.counts} syauData={pageData.syauData} />
        case 'mapper':
            return <pageData.mapperPanel mapSettings={pageData.settings} view={pageData.view} />
        case 'error':
            return <ErrorScreen data={pageData} />
        case 'initialLoad':
            return (
                <PageTemplate showFooter={false}>
                    <InitialLoad />
                </PageTemplate>
            )
    }
}
