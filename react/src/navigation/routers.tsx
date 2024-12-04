import React, { CSSProperties, ReactNode, useContext, useEffect } from 'react'
import { ZodError } from 'zod'

import { AboutPanel } from '../components/AboutPanel'
import { DataCreditPanel } from '../components/DataCreditPanel'
import { IndexPanel } from '../components/IndexPanel'
import { ArticlePanel } from '../components/article-panel'
import { ComparisonPanel } from '../components/comparison-panel'
import { MapperPanel } from '../components/mapper-panel'
import { QuizPanel } from '../components/quiz-panel'
import { StatisticPanel } from '../components/statistic-panel'
import { useColors } from '../page_template/colors'
import { PageTemplate } from '../page_template/template'

import { Navigator, PageData, PageDescriptor, urlFromPageDescriptor } from './navigator'

export function Router(): ReactNode {
    const navigator = useContext(Navigator.Context)

    useEffect(() => {
        // Hook into the browser back/forward buttons
        const listener = (popStateEvent: PopStateEvent): void => {
            if (popStateEvent.state === null) {
                // When we use window.location.replace below
                return
            }
            void navigator.navigate(popStateEvent.state as PageDescriptor, null)
        }
        window.addEventListener('popstate', listener)
        return () => { window.removeEventListener('popstate', listener) }
    }, [navigator])

    const pageState = navigator.usePageState()

    const url = urlFromPageDescriptor(pageState.current.descriptor)

    useEffect(() => {
        if (url.hash !== '') {
            /* eslint-disable no-restricted-syntax -- Core navigation functionality */
            window.location.replace(url.hash)
            history.replaceState(pageState.current.descriptor, '')
            /* eslint-enable no-restricted-syntax */
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Should only execute when the hash changes
    }, [url.hash])

    return (
        <>
            <PageRouter pageData={pageState.current.data} />
            {pageState.kind === 'loading' ? <LoadingScreen /> : null}
        </>
    )
}

function LoadingScreen(): ReactNode {
    return (
        <h1>
            Loading...
        </h1>
    )
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
                <ArticlePanel article={pageData.article} rows={pageData.rows} />
            )
        case 'comparison':
            return (
                <ComparisonPanel articles={pageData.articles} universes={pageData.universes} rows={pageData.rows} />
            )
        case 'statistic':
            return (
                <StatisticPanel
                    {...pageData}
                />
            )
        case 'index':
            return <IndexPanel />
        case 'about':
            return <AboutPanel />
        case 'dataCredit':
            return <DataCreditPanel />
        case 'quiz':
            return (
                <QuizPanel
                    quizDescriptor={pageData.quizDescriptor}
                    today_name={pageData.todayName}
                    todays_quiz={pageData.quiz}
                    parameters={pageData.parameters}
                />
            )
        case 'mapper':
            return <MapperPanel map_settings={pageData.settings} view={pageData.view} />
        case 'error':
            return <ErrorScreen data={pageData} />
        case 'initialLoad':
            return <PageTemplate />
    }
}
