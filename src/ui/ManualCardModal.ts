/**
 * ManualCardModal - Modal for manually creating learning cards
 */

import { Modal, App, Notice } from 'obsidian';
import { LearningCard, LearningCardType, createLearningCard } from '../types/learning';

export interface ManualCardModalResult {
  card: LearningCard;
}

export class ManualCardModal extends Modal {
  private onSubmit: (result: ManualCardModalResult) => void;
  private sourceFile: string;

  // Form elements
  private typeSelect!: HTMLSelectElement;
  private frontInput!: HTMLTextAreaElement;
  private backInput!: HTMLTextAreaElement;
  private mcqWrapper!: HTMLDivElement;
  private optionInputs: { input: HTMLInputElement; checkbox: HTMLInputElement }[] = [];

  constructor(
    app: App,
    sourceFile: string,
    onSubmit: (result: ManualCardModalResult) => void
  ) {
    super(app);
    this.sourceFile = sourceFile;
    this.onSubmit = onSubmit;
  }

  onOpen(): void {
    const { contentEl, modalEl } = this;
    contentEl.empty();
    contentEl.addClass('sil-manual-card-modal');

    // Make modal smaller
    modalEl.addClass('sil-compact-modal');

    // Header row with title and type selector
    const headerRow = contentEl.createDiv({ cls: 'sil-modal-header-row' });
    headerRow.createEl('h3', { text: '수동 카드 생성' });

    this.typeSelect = headerRow.createEl('select', { cls: 'sil-type-select-compact' });
    const types: { value: LearningCardType; label: string }[] = [
      { value: 'flashcard', label: '플래시카드' },
      { value: 'fill_blank', label: '빈칸 채우기' },
      { value: 'multiple_choice', label: '객관식' },
      { value: 'short_answer', label: '단답형' },
    ];
    types.forEach(type => {
      this.typeSelect.createEl('option', { text: type.label, attr: { value: type.value } });
    });
    this.typeSelect.onchange = () => this.onTypeChange();

    const form = contentEl.createDiv({ cls: 'sil-modal-form-compact' });

    // Front (Question) - compact
    const frontWrapper = form.createDiv({ cls: 'sil-form-row' });
    frontWrapper.createEl('label', { text: '질문' });
    this.frontInput = frontWrapper.createEl('textarea', {
      attr: { placeholder: '질문 또는 앞면 내용...', rows: '2' },
      cls: 'sil-input-compact'
    });

    // Back (Answer) - compact
    const backWrapper = form.createDiv({ cls: 'sil-form-row' });
    backWrapper.createEl('label', { text: '정답' });
    this.backInput = backWrapper.createEl('textarea', {
      attr: { placeholder: '정답 또는 뒷면 내용...', rows: '2' },
      cls: 'sil-input-compact'
    });

    // MCQ options container (hidden by default)
    this.mcqWrapper = form.createDiv({ cls: 'sil-mcq-compact' });
    this.mcqWrapper.style.display = 'none';
    this.mcqWrapper.createEl('label', { text: '선택지 (정답 체크)' });

    const optionsGrid = this.mcqWrapper.createDiv({ cls: 'sil-options-grid' });
    for (let i = 0; i < 4; i++) {
      const optionRow = optionsGrid.createDiv({ cls: 'sil-option-row-compact' });
      const checkbox = optionRow.createEl('input', { attr: { type: 'checkbox' } });
      const input = optionRow.createEl('input', {
        cls: 'sil-option-input-compact',
        attr: { type: 'text', placeholder: `선택지 ${i + 1}` }
      });
      this.optionInputs.push({ input, checkbox });
    }

    // Buttons - inline at bottom
    const buttonRow = contentEl.createDiv({ cls: 'sil-modal-buttons-compact' });

    const cancelBtn = buttonRow.createEl('button', { text: '취소', cls: 'sil-btn-compact' });
    cancelBtn.onclick = () => this.close();

    const createBtn = buttonRow.createEl('button', { text: '카드 생성', cls: 'sil-btn-compact sil-btn-primary-compact' });
    createBtn.onclick = () => this.handleCreate();
  }

  private onTypeChange(): void {
    const type = this.typeSelect.value as LearningCardType;
    this.mcqWrapper.style.display = type === 'multiple_choice' ? 'block' : 'none';

    if (type === 'fill_blank') {
      this.frontInput.placeholder = '빈칸은 ___ 로 표시...';
      this.backInput.placeholder = '빈칸에 들어갈 정답...';
    } else {
      this.frontInput.placeholder = '질문 또는 앞면 내용...';
      this.backInput.placeholder = '정답 또는 뒷면 내용...';
    }
  }

  private handleCreate(): void {
    const front = this.frontInput.value.trim();
    const back = this.backInput.value.trim();

    if (!front || !back) {
      new Notice('질문과 정답을 모두 입력하세요');
      return;
    }

    const cardType = this.typeSelect.value as LearningCardType;
    let options: { id: string; text: string; isCorrect: boolean }[] | undefined;

    if (cardType === 'multiple_choice') {
      options = this.optionInputs
        .filter(o => o.input.value.trim())
        .map((o, idx) => ({
          id: `opt_${idx}`,
          text: o.input.value.trim(),
          isCorrect: o.checkbox.checked,
        }));

      if (options.length < 2) {
        new Notice('객관식은 최소 2개의 선택지가 필요합니다');
        return;
      }
      if (!options.some(o => o.isCorrect)) {
        new Notice('정답을 하나 이상 선택하세요');
        return;
      }
    }

    const newCard = createLearningCard({
      type: cardType,
      sourceFile: this.sourceFile,
      front,
      back,
      options,
      tags: ['수동생성'],
      difficulty: 3,
    });

    this.onSubmit({ card: newCard });
    this.close();
  }

  onClose(): void {
    const { contentEl } = this;
    contentEl.empty();
  }
}
