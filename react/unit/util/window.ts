/**
 * Enough of a browser for modules that touch `window` as they load. Nothing here is read back --
 * the code doing the touching is setting up for a page that these tests never render.
 */
global.window = { history: {} } as unknown as Window & typeof globalThis
