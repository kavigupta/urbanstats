// Aliased over `react` by rspack.config.js, so every element passes through here.
// React only checks keys in its development build.
const React = require('../node_modules/react/index.js') // By path, since `react` resolves back to this file

const elementType = Symbol.for('react.element')

// React keys positional children by position and never asks them for a key of their own, even
// once they have become the array that `<div {...props} />` passes on
const positional = new WeakSet()

// One report per list, so a long list can't flood the console on every render
function checkKeys(children) {
    const seen = new Set()
    let reported = false
    for (const child of children) {
        if (Array.isArray(child)) {
            // React keys a nested array by its position, so its keys are a separate scope
            checkKeys(child)
            continue
        }
        if (reported || child?.$$typeof !== elementType) {
            continue
        }
        if (child.key === null) {
            if (!positional.has(child)) {
                const name = typeof child.type === 'string' ? child.type : (child.type?.displayName ?? child.type?.name ?? 'component')
                console.error(`[failtest] Each child in a list should have a unique "key" prop, but a <${name}> has none\n${new Error().stack}`)
                reported = true
            }
            continue
        }
        if (seen.has(child.key)) {
            console.error(`[failtest] Encountered two children with the same key, \`${child.key}\`\n${new Error().stack}`)
            reported = true
        }
        seen.add(child.key)
    }
}

module.exports = {
    ...React,
    createElement(type, props, ...children) {
        // Without positional children, React renders props.children instead
        for (const child of children.length > 0 ? children : [props?.children]) {
            if (Array.isArray(child)) {
                checkKeys(child)
            }
            else if (child?.$$typeof === elementType) {
                positional.add(child)
            }
        }
        return React.createElement(type, props, ...children)
    },
}
