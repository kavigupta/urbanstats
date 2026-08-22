import { createRequestExecutor } from './execute-request'
import { USSExecutionRequest } from './workerManager'

// One per worker, so a script rerun as it is edited keeps the geography it is over.
const executeRequest = createRequestExecutor()

onmessage = async (message: MessageEvent<{ request: USSExecutionRequest, id: number }>) => {
    if (!('request' in message.data)) {
        // Some other message (e.g. from React devtools)
        return
    }
    const result = await executeRequest(message.data.request)
    postMessage({ result, id: message.data.id })
}
