import { executeRequest } from './execute-request'
import { USSExecutionRequest } from './workerManager'

onmessage = async (message: MessageEvent<{ request: USSExecutionRequest, id: number }>) => {
    if (!('request' in message.data)) {
        // Some other message (e.g. from React devtools)
        return
    }
    const result = await executeRequest(message.data.request)
    postMessage({ result, id: message.data.id })
}
