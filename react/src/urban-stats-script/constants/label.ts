import { AttributedText } from '../../utils/AttributedText'

export interface Label {
    bottomLeft: [number, number]
    topRight: [number, number]
    text: AttributedText
    backgroundColor: string
    borderColor: string
    borderWidth: number
}
