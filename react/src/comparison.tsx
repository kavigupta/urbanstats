import React from 'react'
import ReactDOM from 'react-dom/client'
import './style.css'
import './common.css'

import { Navigator } from './navigation/navigator'

function loadPage(): void {
    const root = ReactDOM.createRoot(document.getElementById('root')!)
    root.render(
        <Navigator />,
    )
}

loadPage()
