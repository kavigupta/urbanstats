import { loadSearchIndex } from './search'

postMessage(await loadSearchIndex())
