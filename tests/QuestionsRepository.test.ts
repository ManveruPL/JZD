import { describe, it, expect, beforeEach } from 'vitest';
import { QuestionsRepository } from '../src/engine/QuestionsRepository.js';
import { Question } from '../src/types/index.js';

const mockQuestions: Question[] = [
  { id: 1, question: 'Pytanie 1', answer: 'Odp 1', category: 'sport', source: 'test' },
  { id: 2, question: 'Pytanie 2', answer: 'Odp 2', category: 'sport', source: 'test' },
  { id: 3, question: 'Pytanie 3', answer: 'Odp 3', category: 'historia', source: 'test' },
  { id: 4, question: 'Pytanie 4', answer: 'Odp 4', category: 'geografia', source: 'test' },
  { id: 5, question: 'Pytanie 5', answer: 'Odp 5', category: 'nauki-scisle', source: 'test' }
];

describe('QuestionsRepository', () => {
  let repo: QuestionsRepository;

  beforeEach(() => {
    repo = new QuestionsRepository([...mockQuestions]);
  });

  it('zwraca prawidłową łączną liczbę pytań', () => {
    expect(repo.totalQuestionsCount).toBe(5);
    expect(repo.usedQuestionsCount).toBe(0);
  });

  it('losuje pytania bez powtórzeń', () => {
    const q1 = repo.drawQuestion();
    const q2 = repo.drawQuestion();

    expect(q1.id).not.toBe(q2.id);
    expect(repo.usedQuestionsCount).toBe(2);
  });

  it('filtruje pytania według dozwolonych kategorii', () => {
    repo.setAllowedCategories(['sport']);
    const available = repo.getAvailableQuestions();
    expect(available.length).toBe(2);
    expect(available.every(q => q.category === 'sport')).toBe(true);
  });

  it('losuje całą pulę pytań o żądanym rozmiarze', () => {
    const pool = repo.drawPool(3);
    expect(pool.length).toBe(3);
    expect(repo.usedQuestionsCount).toBe(3);
  });

  it('rzuca błąd przy wyczerpaniu pytań w bazie', () => {
    repo.drawPool(5);
    expect(() => repo.drawQuestion()).toThrow('Brak dostępnych pytań');
  });

  it('resetuje użyte pytania', () => {
    repo.drawPool(4);
    expect(repo.usedQuestionsCount).toBe(4);
    repo.resetUsed();
    expect(repo.usedQuestionsCount).toBe(0);
    expect(repo.getAvailableQuestions().length).toBe(5);
  });
});
