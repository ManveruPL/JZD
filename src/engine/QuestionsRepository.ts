import fs from 'fs';
import path from 'path';
import { Question } from '../types/index.js';

export class QuestionsRepository {
  private questions: Question[] = [];
  private usedQuestionIds = new Set<number>();
  private allowedCategories?: Set<string>;

  constructor(questionsOrPath?: Question[] | string) {
    if (Array.isArray(questionsOrPath)) {
      this.questions = questionsOrPath;
    } else if (typeof questionsOrPath === 'string') {
      this.loadFromFile(questionsOrPath);
    } else {
      // Default to data/questions.json
      const defaultPath = path.resolve(process.cwd(), 'data/questions.json');
      if (fs.existsSync(defaultPath)) {
        this.loadFromFile(defaultPath);
      }
    }
  }

  public loadFromFile(filePath: string): void {
    const raw = fs.readFileSync(filePath, 'utf8');
    this.questions = JSON.parse(raw);
    this.usedQuestionIds.clear();
  }

  public setAllowedCategories(categories?: string[]): void {
    if (categories && categories.length > 0) {
      this.allowedCategories = new Set(categories.map(c => c.toLowerCase()));
    } else {
      this.allowedCategories = undefined;
    }
  }

  public getAvailableQuestions(): Question[] {
    return this.questions.filter(q => {
      if (this.usedQuestionIds.has(q.id)) return false;
      if (this.allowedCategories && !this.allowedCategories.has(q.category.toLowerCase())) {
        return false;
      }
      return true;
    });
  }

  public drawQuestion(): Question {
    const available = this.getAvailableQuestions();
    if (available.length === 0) {
      throw new Error('Brak dostępnych pytań w bazie dla wybranych kategorii!');
    }
    const randomIndex = Math.floor(Math.random() * available.length);
    const chosen = available[randomIndex];
    this.usedQuestionIds.add(chosen.id);
    return chosen;
  }

  public drawPool(count: number): Question[] {
    const available = this.getAvailableQuestions();
    if (available.length < count) {
      throw new Error(`Niewystarczająca liczba pytań: wymagano ${count}, dostępnych ${available.length}!`);
    }

    // Fisher-Yates shuffle
    const shuffled = [...available];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const selected = shuffled.slice(0, count);
    selected.forEach(q => this.usedQuestionIds.add(q.id));
    return selected;
  }

  public markAsUsed(questionId: number): void {
    this.usedQuestionIds.add(questionId);
  }

  public resetUsed(): void {
    this.usedQuestionIds.clear();
  }

  public get totalQuestionsCount(): number {
    return this.questions.length;
  }

  public get usedQuestionsCount(): number {
    return this.usedQuestionIds.size;
  }
}
