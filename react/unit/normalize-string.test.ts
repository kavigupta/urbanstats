import assert from 'assert/strict'
import { describe, test } from 'node:test'

import { normalize } from '../src/utils/normalize-string'

void describe('normalize', () => {
    void test('strips accents', () => {
        assert.equal(normalize('Bình Định'), 'binh dinh')
    })

    void test('folds letters NFD does not split into a base letter and an accent', () => {
        assert.equal(normalize('Gießen'), 'giessen')
        assert.equal(normalize('Piła'), 'pila')
        assert.equal(normalize('Adıyaman'), 'adiyaman')
        assert.equal(normalize('Høyanger'), 'hoyanger')
        assert.equal(normalize('Höfuðborgarsvæði'), 'hofudborgarsvaedi')
        assert.equal(normalize('Għajnsielem'), 'ghajnsielem')
        assert.equal(normalize('Balakən'), 'balakan')
        assert.equal(normalize('Spœ'), 'spoe')
    })
})
