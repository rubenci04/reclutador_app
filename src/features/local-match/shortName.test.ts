import { describe, expect, it } from 'vitest'
import { shortName } from './shortName'

describe('shortName compound surnames', () => {
  it.each([
    ['Kevin De Bruyne', 'K. De Bruyne'],
    ['Matthijs de Ligt', 'M. de Ligt'],
    ['Alexis Mac Allister', 'A. Mac Allister'],
  ])('preserves the compound surname in %s', (name, expected) => {
    expect(shortName(name)).toBe(expected)
  })
  it.each(['de', 'del', 'da', 'dos', 'di', 'van', 'von', 'mac', 'mc', 'al', 'el', 'san', 'st', 'st.'])('recognizes %s regardless of case and preserves its spelling', particle => {
    for (const spelling of [particle, particle.toUpperCase()]) expect(shortName(`Alexandre ${spelling} Silva`)).toBe(`A. ${spelling} Silva`)
  })
  it('adds an ellipsis only beyond the 12-character surname boundary', () => {
    expect(shortName('Kevin De Abcdefghi')).toBe('K. De Abcdefghi')
    expect(shortName('Kevin De Abcdefghij')).toBe('K. De Abcdefg…')
    expect(shortName('Juan Carlos de Almeidasilva')).toBe('J. de Almeida…')
  })
  it('preserves short names and the existing abbreviation of ordinary surnames', () => {
    expect(shortName('Messi')).toBe('Messi')
    expect(shortName('Ana de Paz')).toBe('Ana de Paz')
    expect(shortName('Lionel Andrés Messi')).toBe('L. Messi')
  })
})
