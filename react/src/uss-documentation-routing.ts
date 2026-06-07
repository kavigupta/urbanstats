import { defaultTypeEnvironment } from './mapper/context'
import { defaultConstants } from './urban-stats-script/constants/constants'
import { constantCategories, ConstantCategory } from './urban-stats-script/documentation-category'
import { USSDocumentedType } from './urban-stats-script/types-values'
import { DefaultMap } from './utils/DefaultMap'
import { assert } from './utils/defensive'

function constantsDocumentationDirect(): {
    sortedCategories: [ConstantCategory, [string, USSDocumentedType][]][]
} {
    const constantsByCategory = new DefaultMap<ConstantCategory, [string, USSDocumentedType][]>(() => [])
    const mapperContext = defaultTypeEnvironment('world')

    for (const [name, value] of defaultConstants) {
        const category = value.documentation?.category
        assert(category !== undefined, `Constant ${name} does not have a category defined.`)
        constantsByCategory.get(category).push([name, value])
    }

    for (const [name, value] of mapperContext) {
        if (defaultConstants.has(name)) continue

        const category = value.documentation?.category
        assert(category !== undefined, `Constant ${name} does not have a category defined.`)
        if (constantCategories.includes(category)) {
            constantsByCategory.get(category).push([name, value])
        }
    }

    const categoryOrder = constantCategories
    const sortedCategories = Array.from(constantsByCategory.entries()).sort((a, b) => {
        const aIndex = categoryOrder.indexOf(a[0])
        const bIndex = categoryOrder.indexOf(b[0])
        return aIndex - bIndex
    })

    return { sortedCategories }
}

let cachedConstantsDocumentationData: ReturnType<typeof constantsDocumentationDirect> | undefined

export function constantsDocumentationData(): ReturnType<typeof constantsDocumentationDirect> {
    if (cachedConstantsDocumentationData === undefined) {
        cachedConstantsDocumentationData = constantsDocumentationDirect()
    }
    return cachedConstantsDocumentationData
}
