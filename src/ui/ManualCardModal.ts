/**
 * ManualCardModal - Modal for manually creating learning cards
 */

import { Modal, App, Notice } from 'obsidian';
import { LearningCard, LearningCardType, createLearningCard } from '../types/learning';
import { t } from '../i18n';

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
    headerRow.createEl('h3', { text: t().manualCard.title });

    this.typeSelect = headerRow.createEl('select', { cls: 'sil-type-select-compact' });
    const types: { value: LearningCardType; label: string }[] = [
      { value: 'flashcard', label: t().cardType.flashcard },
      { value: 'fill_blank', label: t().cardType.fill_blank },
      { value: 'multiple_choice', label: t().cardType.multiple_choice },
      { value: 'short_answer', label: t().cardType.short_answer },
    ];
    types.forEach(type => {
      this.typeSelect.createEl('option', { text: type.label, attr: { value: type.value } });
    });
    this.typeSelect.onchange = () => this.onTypeChange();

    const form = contentEl.createDiv({ cls: 'sil-modal-form-compact' });

    // Front (Question) - compact
    const frontWrapper = form.createDiv({ cls: 'sil-form-row' });
    frontWrapper.createEl('label', { text: t().manualCard.question });
    this.frontInput = frontWrapper.createEl('textarea', {
      attr: { placeholder: t().manualCard.questionPlaceholder, rows: '2' },
      cls: 'sil-input-compact'
    });

    // Back (Answer) - compact
    const backWrapper = form.createDiv({ cls: 'sil-form-row' });
    backWrapper.createEl('label', { text: t().manualCard.answer });
    this.backInput = backWrapper.createEl('textarea', {
      attr: { placeholder: t().manualCard.answerPlaceholder, rows: '2' },
      cls: 'sil-input-compact'
    });

    // MCQ options container (hidden by default)
    this.mcqWrapper = form.createDiv({ cls: 'sil-mcq-compact' });
    this.mcqWrapper.style.display = 'none';
    this.mcqWrapper.createEl('label', { text: t().manualCard.options });

    const optionsGrid = this.mcqWrapper.createDiv({ cls: 'sil-options-grid' });
    for (let i = 0; i < 4; i++) {
      const optionRow = optionsGrid.createDiv({ cls: 'sil-option-row-compact' });
      const checkbox = optionRow.createEl('input', { attr: { type: 'checkbox' } });
      const input = optionRow.createEl('input', {
        cls: 'sil-option-input-compact',
        attr: { type: 'text', placeholder: t().manualCard.optionPlaceholder(i + 1) }
      });
      this.optionInputs.push({ input, checkbox });
    }

    // Buttons - inline at bottom
    const buttonRow = contentEl.createDiv({ cls: 'sil-modal-buttons-compact' });

    const cancelBtn = buttonRow.createEl('button', { text: t().common.cancel, cls: 'sil-btn-compact' });
    cancelBtn.onclick = () => this.close();

    const createBtn = buttonRow.createEl('button', { text: t().manualCard.createCard, cls: 'sil-btn-compact sil-btn-primary-compact' });
    createBtn.onclick = () => this.handleCreate();
  }

  private onTypeChange(): void {
    const type = this.typeSelect.value as LearningCardType;
    this.mcqWrapper.style.display = type === 'multiple_choice' ? 'block' : 'none';

    if (type === 'fill_blank') {
      this.frontInput.placeholder = t().manualCard.blankQuestionPlaceholder;
      this.backInput.placeholder = t().manualCard.blankAnswerPlaceholder;
    } else {
      this.frontInput.placeholder = t().manualCard.questionPlaceholder;
      this.backInput.placeholder = t().manualCard.answerPlaceholder;
    }
  }

  private handleCreate(): void {
    const front = this.frontInput.value.trim();
    const back = this.backInput.value.trim();

    if (!front || !back) {
      new Notice(t().notice.enterQuestion);
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
        new Notice(t().notice.mcqMinOptions);
        return;
      }
      if (!options.some(o => o.isCorrect)) {
        new Notice(t().notice.mcqSelectCorrect);
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
