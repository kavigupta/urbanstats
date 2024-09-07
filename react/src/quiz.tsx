import React from 'react'
import ReactDOM from 'react-dom/client'
import './style.css'
import './common.css'

import { QuizPanel } from './components/quiz-panel'
import { loadJSON } from './load_json'
import { get_daily_offset_number, get_retrostat_offset_number } from './quiz/dates'
import { JuxtaQuestionJSON, QuizDescriptor, RetroQuestionJSON, load_juxta, load_retro } from './quiz/quiz'

const ENDPOINT = 'https://persistent.urbanstats.org'

async function loadPage(): Promise<void> {
    document.title = 'Juxtastat'
    const root = ReactDOM.createRoot(document.getElementById('root')!)
    // if there's a query, parse it
    const params_string = window.location.search.substring(1) || window.location.hash.substring(1)
    let urlParams = new URLSearchParams(
        params_string,
    )
    if (urlParams.has('short')) {
    // look up short url
        const short = urlParams.get('short')
        // POST to endpoint
        const responseJson = await fetch(`${ENDPOINT}/lengthen`, {
            method: 'POST',
            body: JSON.stringify({ shortened: short }),
            headers: {
                'Content-Type': 'application/json',
            },
        }).then(response => response.json() as Promise<{ full_text: string }>)
        urlParams = new URLSearchParams(responseJson.full_text)
    }
    const mode = urlParams.get('mode')
    let todays_quiz
    let today_name: string
    let descriptor: QuizDescriptor
    if (mode === 'retro') {
        document.title = 'Retrostat'
        let retro = get_retrostat_offset_number()
        if (urlParams.has('date')) {
            retro = parseInt(urlParams.get('date')!)
        }
        descriptor = {
            kind: 'retrostat',
            name: `W${retro}`,
        }
        today_name = `Week ${retro}`
        todays_quiz = (loadJSON(`/retrostat/${retro}`) as RetroQuestionJSON[]).map(load_retro)
    }
    else {
    // daily quiz
        let today: number
        if (urlParams.has('date')) {
            today = parseInt(urlParams.get('date')!)
        }
        else {
            today = get_daily_offset_number()
        }
        todays_quiz = (loadJSON(`/quiz/${today}`) as JuxtaQuestionJSON[]).map(load_juxta)
        today_name = today.toString()
        descriptor = { kind: 'juxtastat', name: today }
    }
    root.render(
        <QuizPanel
            quizDescriptor={descriptor}
            today_name={today_name}
            todays_quiz={todays_quiz}
            parameters={params_string}
        />,
    )
}

void loadPage()
