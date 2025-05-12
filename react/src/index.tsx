import React from 'react'
import ReactDOM from 'react-dom/client'

import './style.css'
import './common.css'

import { Router } from './navigation/routers'

declare global {
    /* eslint-disable no-restricted-syntax,no-var -- Global variables */
    var startUrbanstats: () => void
    /* eslint-enable no-restricted-syntax,no-var */
}

function loadPage(): void {
    const root = ReactDOM.createRoot(document.getElementById('root')!)
    root.render(
        <Router />,
    )
    document.getElementById('loading')!.remove()
}

window.startUrbanstats = loadPage
