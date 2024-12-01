import React from 'react'
import ReactDOM from 'react-dom/client'

import './style.css'
import './common.css'

import { Router } from './navigation/navigator'

function loadPage(): void {
    const root = ReactDOM.createRoot(document.getElementById('root')!)
    root.render(
        <Router />,
    )
}

loadPage()
