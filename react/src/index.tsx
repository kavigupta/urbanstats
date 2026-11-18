import React from 'react'
import ReactDOM from 'react-dom/client'

import './style.css'
import './common.css'

import { ErrorBoundary } from './ErrorBoundary'
import { Router } from './navigation/routers'

function loadPage(): void {
    const root = ReactDOM.createRoot(document.getElementById('root')!)
    root.render(
        <ErrorBoundary>
            <Router />
        </ErrorBoundary>,
    )
    document.getElementById('loading')!.remove()
}

loadPage()
