import React, { ReactNode, useContext, useEffect } from 'react'

import { AboutPanel } from '../components/AboutPanel'
import { DataCreditPanel } from '../components/DataCreditPanel'
import { IndexPanel } from '../components/IndexPanel'
import { ArticlePanel } from '../components/article-panel'
import { ComparisonPanel } from '../components/comparison-panel'
import { MapperPanel } from '../components/mapper-panel'
import { QuizPanel } from '../components/quiz-panel'
import { StatisticPanel } from '../components/statistic-panel'

import { Navigator, PageData, PageDescriptor } from './navigator'

export function Router(): ReactNode {
    const navigator = useContext(Navigator.Context)

    useEffect(() => {
        // Hook into the browser back/forward buttons
        const listener = (popStateEvent: PopStateEvent): void => {
            void navigator.navigate(popStateEvent.state as PageDescriptor, null)
        }
        window.addEventListener('popstate', listener)
        return () => { window.removeEventListener('popstate', listener) }
    }, [navigator])

    const pageState = navigator.usePageState()

    return (
        <>
            {pageState.current !== undefined ? <PageRouter pageData={pageState.current.data} /> : null}
            {pageState.kind === 'loading' ? <LoadingScreen /> : null}
            {pageState.kind === 'error' ? <ErrorScreen error={pageState.error} /> : null}
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

function ErrorScreen({ error }: { error: unknown }): ReactNode {
    return (
        <h1>
            Error:
            {String(error)}
        </h1>
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
    }
}
