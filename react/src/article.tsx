import React from 'react'
import ReactDOM from 'react-dom/client'

import './style.css'
import './common.css'

import { discordFix } from './discord-fix'
import { Navigator } from './navigation/navigator'

function loadPage(): void {
    const root = ReactDOM.createRoot(document.getElementById('root')!)
    root.render(
        <Navigator />,
    )
}

discordFix()
loadPage()
