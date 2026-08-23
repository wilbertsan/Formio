import { faqItems } from '@/features/landing/config/faq'

describe('faqItems', () => {
  it('contém entre 5 e 6 perguntas', () => {
    expect(faqItems.length).toBeGreaterThanOrEqual(5)
    expect(faqItems.length).toBeLessThanOrEqual(6)
  })

  it('toda pergunta possui resposta não vazia', () => {
    for (const item of faqItems) {
      expect(item.question.trim()).not.toBe('')
      expect(item.answer.trim()).not.toBe('')
    }
  })

  it('não repete perguntas', () => {
    const questions = faqItems.map((item) => item.question)
    expect(new Set(questions).size).toBe(questions.length)
  })
})