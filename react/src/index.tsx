import React from 'react'
import ReactDOM from 'react-dom/client'

import './style.css'
import './common.css'

import { getTokenInfo } from './components/LoginPanel'
import { Router } from './navigation/routers'

async function loadPage(): Promise<void> {
    const root = ReactDOM.createRoot(document.getElementById('root')!)
    // just ensure that the token info is loaded before rendering the app. This will hijack the process
    // and send you to the login page if the token is not valid
    void await getTokenInfo(30)
    root.render(
        <Router />,
    )
    document.getElementById('loading')!.remove()
}

void loadPage()
