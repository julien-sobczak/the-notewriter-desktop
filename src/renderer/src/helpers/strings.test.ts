import { stripMarkdownEmphasis } from './strings'

describe('stripMarkdownEmphasis', () => {
  it('should remove bold markdown syntax', () => {
    expect(stripMarkdownEmphasis('**bold text**')).toBe('bold text')
    expect(stripMarkdownEmphasis('__bold text__')).toBe('bold text')
  })

  it('should remove italic markdown syntax', () => {
    expect(stripMarkdownEmphasis('*italic text*')).toBe('italic text')
    expect(stripMarkdownEmphasis('_italic text_')).toBe('italic text')
  })

  it('should remove mixed emphasis syntax', () => {
    expect(stripMarkdownEmphasis('some ***bold italic*** text')).toBe('some bold italic text')
    expect(stripMarkdownEmphasis('some **bold** and *italic* text')).toBe(
      'some bold and italic text'
    )
  })

  it('should handle nested emphasis', () => {
    expect(stripMarkdownEmphasis('**bold with *italic* inside**')).toBe('bold with italic inside')
  })

  it('should return unchanged text without emphasis', () => {
    expect(stripMarkdownEmphasis('plain text')).toBe('plain text')
  })

  it('should handle empty string', () => {
    expect(stripMarkdownEmphasis('')).toBe('')
  })

  it('should handle incomplete emphasis syntax', () => {
    expect(stripMarkdownEmphasis('**incomplete bold')).toBe('**incomplete bold')
    expect(stripMarkdownEmphasis('*incomplete italic')).toBe('*incomplete italic')
  })
})
