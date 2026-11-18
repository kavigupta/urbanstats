import { persistentClient } from '../utils/urbanstats-persistent-client'

import { AuthenticationStateMachine } from './AuthenticationStateMachine'
import { QuizModel } from './quiz'

export async function addFriend(friendID: string, friendName: string): Promise<undefined | { errorMessage: string, problemDomain: 'friendID' | 'friendName' | 'other' }> {
    const user = QuizModel.shared.uniquePersistentId.value
    const email = AuthenticationStateMachine.shared.state.email
    const idOrEmail = 'Friend ID or Email'
    if (friendID === '') {
        return { errorMessage: `${idOrEmail} cannot be empty`, problemDomain: 'friendID' }
    }
    if (friendID === user) {
        return { errorMessage: 'Friend ID cannot be your own ID', problemDomain: 'friendID' }
    }
    if (friendID === email) {
        return { errorMessage: 'Friend Email cannot be your own Email', problemDomain: 'friendID' }
    }
    let dupFriend
    if ((dupFriend = QuizModel.shared.friends.value.find(([name, id]) => name !== null && id === friendID))) {
        return { errorMessage: `${idOrEmail} ${friendID} already exists as ${dupFriend[0]}`, problemDomain: 'friendID' }
    }
    if (friendName === '') {
        return { errorMessage: 'Friend name cannot be empty', problemDomain: 'friendName' }
    }
    if (QuizModel.shared.friends.value.map(x => x[0]).includes(friendName)) {
        return { errorMessage: 'Friend name already exists', problemDomain: 'friendName' }
    }
    try {
        const { response, error } = await persistentClient.POST('/juxtastat/friend_request', {
            body: { requestee: friendID },
            params: {
                header: QuizModel.shared.userHeaders(),
            },
        })

        if (response.status === 422) {
            return { errorMessage: `Invalid ${idOrEmail}`, problemDomain: 'friendID' }
        }
        if (error !== undefined) {
            return { errorMessage: 'Unknown Error', problemDomain: 'other' }
        }

        QuizModel.shared.friends.value = [...QuizModel.shared.friends.value.filter(([,id]) => id !== friendID), [friendName, friendID, Date.now()]]
        return undefined
    }
    catch {
        return { errorMessage: 'Network Error', problemDomain: 'other' }
    }
}

export async function addFriendFromLink(friendID: string, friendName: string): Promise<void> {
    const result = await addFriend(friendID, friendName)
    if (result === undefined) {
        alert(`Friend added: ${friendName} !`)
    }
    else {
        if (result.problemDomain === 'friendName') {
            const newFriendName = prompt(`Could not add friend: ${result.errorMessage}\n\nPlease correct the friend name:`, friendName)
            if (newFriendName !== null) {
                await addFriendFromLink(friendID, newFriendName.trim())
            }
        }
        else {
            alert(`Could not add friend: ${result.errorMessage}`)
        }
    }
}
