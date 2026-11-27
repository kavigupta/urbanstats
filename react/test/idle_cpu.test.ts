import { editButton } from './edit_mode_test_utils'
import { quizFixture } from './quiz_test_utils'
import { comparisonPage, target, urbanstatsFixture } from './test_utils'

async function idleUsage(t: TestController): Promise<{ infiniteAnimations: string[], animationFrames: number, taskMs: number }> {
    const cdpSession = await t.getCurrentCDPSession()
    await cdpSession.Performance.enable({})
    await t.wait(5000) // Wait for page to load + stabilize

    await t.eval(() => {
        const win = window as unknown as { idleAnimationFrames: number }
        win.idleAnimationFrames = 0
        const original = window.requestAnimationFrame.bind(window)
        window.requestAnimationFrame = (callback) => {
            win.idleAnimationFrames++
            return original(callback)
        }
    })
    // Excludes time spent serving this test's own CDP commands
    const taskDuration = async (): Promise<number> => {
        const { metrics } = await cdpSession.Performance.getMetrics()
        const metric = (name: string): number => metrics.find(candidate => candidate.name === name)!.value
        return metric('TaskDuration') - metric('DevToolsCommandDuration')
    }
    // Otherwise a one-off major GC of page-load garbage can land in the window
    await cdpSession.HeapProfiler.collectGarbage()
    const taskBefore = await taskDuration()
    await t.wait(3000)
    const taskAfter = await taskDuration()

    const usage = {
        infiniteAnimations: await t.eval(() => document.getAnimations()
            .filter(animation => animation.playState === 'running' && animation.effect?.getTiming().iterations === Infinity)
            .map(animation => (animation as CSSAnimation).animationName)) as string[],
        animationFrames: await t.eval(() => (window as unknown as { idleAnimationFrames: number }).idleAnimationFrames) as number,
        taskMs: (taskAfter - taskBefore) * 1000,
    }
    console.warn(usage)
    return usage
}

async function expectIdle(t: TestController): Promise<void> {
    const usage = await idleUsage(t)
    await t.expect(usage.infiniteAnimations).eql([])
    await t.expect(usage.animationFrames).lt(10)
    await t.expect(usage.taskMs).lt(100)
}

urbanstatsFixture('idle home', '/')

test('home is idle', expectIdle)

urbanstatsFixture('idle article', '/article.html?longname=California%2C+USA')

test('article is idle', expectIdle)

test('article edit mode is idle', async (t) => {
    await t.click(editButton)
    await expectIdle(t)
})

urbanstatsFixture('idle comparison', comparisonPage(['Sunset CCD [CCD], San Francisco County, California, USA', 'South San Francisco CCD [CCD], San Mateo County, California, USA']))

test('comparison is idle', expectIdle)

urbanstatsFixture('idle statistic', '/statistic.html?statname=Population&article_type=County&start=1&amount=20&universe=California%2C+USA')

test('statistic is idle', expectIdle)

urbanstatsFixture('idle statistic edit mode', `${target}/statistic.html?uss=${encodeURIComponent('customNode(""); condition (true); table(columns=[column(values=density_pw_1km)])')}&article_type=County&start=1&amount=5&universe=California%2C+USA&edit=true`)

test('statistic edit mode is idle', expectIdle)

urbanstatsFixture('idle mapper', '/mapper.html')

test('mapper is idle', expectIdle)

urbanstatsFixture('idle mapper view mode', '/mapper.html?view=true')

test('mapper view mode is idle', expectIdle)

urbanstatsFixture('idle syau', '/syau.html#typ=County&universe=California%2C+USA')

test('syau is idle', expectIdle)

urbanstatsFixture('idle uss documentation', '/uss-documentation.html')

test('uss documentation is idle', expectIdle)

urbanstatsFixture('idle editor', '/editor.html')

test('editor is idle', expectIdle)

quizFixture('idle quiz', `${target}/quiz.html#date=90`, {}, '', 'desktop')

test('quiz is idle', expectIdle)

quizFixture('idle infinite quiz', `${target}/quiz.html#mode=infinite&seed=hi&v=1`, {}, '', 'desktop')

test('infinite quiz is idle', expectIdle)
