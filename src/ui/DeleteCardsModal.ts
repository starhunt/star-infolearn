/**
 * DeleteCardsModal - Modal for deleting learning cards with various options
 */

import { Modal, App, Notice, TFile } from 'obsidian';
import { LearningCard } from '../types/learning';

export type DeleteMode = 'all' | 'by-note' | 'by-date';

export interface DeleteCardsModalResult {
  mode: DeleteMode;
  noteFilter?: string;  // For 'by-note' mode
  dateRange?: { from: Date | null; to: Date | null };  // For 'by-date' mode
  cardsToDelete: LearningCard[];
}

export class DeleteCardsModal extends Modal {
  private onSubmit: (result: DeleteCardsModalResult) => void;
  private allCards: LearningCard[];
  private currentFile: TFile | null;

  private selectedMode: DeleteMode = 'all';
  private noteSelect!: HTMLSelectElement;
  private dateFromInput!: HTMLInputElement;
  private dateToInput!: HTMLInputElement;
  private previewCount!: HTMLElement;

  constructor(
    app: App,
    allCards: LearningCard[],
    currentFile: TFile | null,
    onSubmit: (result: DeleteCardsModalResult) => void
  ) {
    super(app);
    this.allCards = allCards;
    this.currentFile = currentFile;
    this.onSubmit = onSubmit;
  }

  onOpen(): void {
    const { contentEl, modalEl } = this;
    contentEl.empty();
    contentEl.addClass('sil-delete-modal');
    modalEl.addClass('sil-compact-modal');

    // Title
    const header = contentEl.createDiv({ cls: 'sil-delete-modal-header' });
    header.createEl('h3', { text: '🗑️ 카드 삭제' });

    // Mode selection
    const modeSection = contentEl.createDiv({ cls: 'sil-delete-mode-section' });

    const modes: { id: DeleteMode; label: string; desc: string }[] = [
      { id: 'all', label: '전체 삭제', desc: `모든 카드 삭제 (${this.allCards.length}개)` },
      { id: 'by-note', label: '노트별 삭제', desc: '특정 노트의 카드만 삭제' },
      { id: 'by-date', label: '기간별 삭제', desc: '특정 기간에 생성된 카드 삭제' },
    ];

    modes.forEach(mode => {
      const modeOption = modeSection.createDiv({ cls: 'sil-delete-mode-option' });
      const radio = modeOption.createEl('input', {
        attr: { type: 'radio', name: 'delete-mode', value: mode.id }
      });
      if (mode.id === 'all') radio.checked = true;

      const labelDiv = modeOption.createDiv({ cls: 'sil-delete-mode-label' });
      labelDiv.createEl('strong', { text: mode.label });
      labelDiv.createEl('span', { text: mode.desc, cls: 'sil-delete-mode-desc' });

      radio.onchange = () => {
        this.selectedMode = mode.id;
        this.updateFilterVisibility();
        this.updatePreview();
      };
      modeOption.onclick = () => {
        radio.checked = true;
        this.selectedMode = mode.id;
        this.updateFilterVisibility();
        this.updatePreview();
      };
    });

    // Filter options container
    const filterSection = contentEl.createDiv({ cls: 'sil-delete-filter-section' });

    // Note filter
    const noteFilterDiv = filterSection.createDiv({ cls: 'sil-filter-option sil-note-filter' });
    noteFilterDiv.createEl('label', { text: '노트 선택:' });
    this.noteSelect = noteFilterDiv.createEl('select', { cls: 'sil-select-compact' });

    // Get unique source files
    const sourceFiles = [...new Set(this.allCards.map(c => c.sourceFile))].sort();

    // Add current file option first if available
    if (this.currentFile) {
      const currentOpt = this.noteSelect.createEl('option', {
        text: `📄 현재 노트: ${this.currentFile.basename}`,
        attr: { value: this.currentFile.path }
      });
      currentOpt.selected = true;
    }

    sourceFiles.forEach(file => {
      if (file !== this.currentFile?.path) {
        const count = this.allCards.filter(c => c.sourceFile === file).length;
        const basename = file.split('/').pop() || file;
        this.noteSelect.createEl('option', {
          text: `${basename} (${count}개)`,
          attr: { value: file }
        });
      }
    });

    this.noteSelect.onchange = () => this.updatePreview();

    // Date filter
    const dateFilterDiv = filterSection.createDiv({ cls: 'sil-filter-option sil-date-filter' });
    dateFilterDiv.createEl('label', { text: '기간:' });

    const dateRow = dateFilterDiv.createDiv({ cls: 'sil-date-filter-row' });
    this.dateFromInput = dateRow.createEl('input', {
      attr: { type: 'date' },
      cls: 'sil-date-input-compact'
    });
    dateRow.createSpan({ text: '~' });
    this.dateToInput = dateRow.createEl('input', {
      attr: { type: 'date' },
      cls: 'sil-date-input-compact'
    });

    // Set default date range (last 30 days)
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    this.dateFromInput.value = thirtyDaysAgo.toISOString().split('T')[0];
    this.dateToInput.value = today.toISOString().split('T')[0];

    this.dateFromInput.onchange = () => this.updatePreview();
    this.dateToInput.onchange = () => this.updatePreview();

    // Preview section
    const previewSection = contentEl.createDiv({ cls: 'sil-delete-preview' });
    this.previewCount = previewSection.createEl('div', { cls: 'sil-preview-count' });

    // Warning
    const warning = contentEl.createDiv({ cls: 'sil-delete-warning' });
    warning.innerHTML = '⚠️ 삭제된 카드는 복구할 수 없습니다.';

    // Buttons
    const buttonRow = contentEl.createDiv({ cls: 'sil-modal-buttons-compact' });

    const cancelBtn = buttonRow.createEl('button', { text: '취소', cls: 'sil-btn-compact' });
    cancelBtn.onclick = () => this.close();

    const deleteBtn = buttonRow.createEl('button', { text: '삭제', cls: 'sil-btn-compact sil-btn-danger' });
    deleteBtn.onclick = () => this.handleDelete();

    // Initial state
    this.updateFilterVisibility();
    this.updatePreview();
  }

  private updateFilterVisibility(): void {
    const noteFilter = this.contentEl.querySelector('.sil-note-filter') as HTMLElement;
    const dateFilter = this.contentEl.querySelector('.sil-date-filter') as HTMLElement;

    if (noteFilter) noteFilter.style.display = this.selectedMode === 'by-note' ? 'block' : 'none';
    if (dateFilter) dateFilter.style.display = this.selectedMode === 'by-date' ? 'block' : 'none';
  }

  private getCardsToDelete(): LearningCard[] {
    switch (this.selectedMode) {
      case 'all':
        return this.allCards;

      case 'by-note':
        const selectedNote = this.noteSelect.value;
        return this.allCards.filter(c => c.sourceFile === selectedNote);

      case 'by-date':
        const fromDate = this.dateFromInput.value ? new Date(this.dateFromInput.value).getTime() : 0;
        const toDate = this.dateToInput.value ? new Date(this.dateToInput.value).getTime() + 24 * 60 * 60 * 1000 : Date.now();
        return this.allCards.filter(c => c.createdAt >= fromDate && c.createdAt < toDate);

      default:
        return [];
    }
  }

  private updatePreview(): void {
    const cards = this.getCardsToDelete();
    const count = cards.length;

    if (count === 0) {
      this.previewCount.innerHTML = '<span class="sil-preview-empty">삭제할 카드가 없습니다</span>';
    } else {
      this.previewCount.innerHTML = `<span class="sil-preview-number">${count}</span>개의 카드가 삭제됩니다`;
    }
  }

  private handleDelete(): void {
    const cardsToDelete = this.getCardsToDelete();

    if (cardsToDelete.length === 0) {
      new Notice('삭제할 카드가 없습니다');
      return;
    }

    const confirmMsg = `정말로 ${cardsToDelete.length}개의 카드를 삭제하시겠습니까?`;
    if (!confirm(confirmMsg)) {
      return;
    }

    this.onSubmit({
      mode: this.selectedMode,
      noteFilter: this.selectedMode === 'by-note' ? this.noteSelect.value : undefined,
      dateRange: this.selectedMode === 'by-date' ? {
        from: this.dateFromInput.value ? new Date(this.dateFromInput.value) : null,
        to: this.dateToInput.value ? new Date(this.dateToInput.value) : null,
      } : undefined,
      cardsToDelete,
    });

    this.close();
  }

  onClose(): void {
    const { contentEl } = this;
    contentEl.empty();
  }
}
