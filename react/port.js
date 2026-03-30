
/**
 * Returns the port number to use for the dev server.
 * Reads from the PORT environment variable, defaulting to 8000.
 * @returns {number} The port number
 */
export function port() {
    return process.env.PORT
        ? parseInt(process.env.PORT, 10) || (() => { throw new Error(`Invalid Port Number ${process.env.port}`) })() 
        : 8000
}