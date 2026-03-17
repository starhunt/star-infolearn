/**
 * DeleteCardsModal - Modal for deleting learning cards with various options
 */

import { Modal, App, Notice, TFile } from 'obsidian';
import { LearningCard } from '../types/learning';
import { t } from '../i18n';

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
    header.createEl('h3', { text: `🗑️ ${t().deleteModal.title}` });

    // Mode selection
    const modeSection = contentEl.createDiv({ cls: 'sil-delete-mode-section' });

    const modes: { id: DeleteMode; label: string; desc: string }[] = [
      { id: 'all', label: t().deleteModal.deleteAll, desc: t().deleteModal.deleteAllDesc(this.allCards.length) },
      { id: 'by-note', label: t().deleteModal.deleteByNote, desc: t().deleteModal.deleteByNoteDesc },
      { id: 'by-date', label: t().deleteModal.deleteByDate, desc: t().deleteModal.deleteByDateDesc },
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
    noteFilterDiv.createEl('label', { text: t().deleteModal.selectNote });
    this.noteSelect = noteFilterDiv.createEl('select', { cls: 'sil-select-compact' });

    // Get unique source files
    const sourceFiles = [...new Set(this.allCards.map(c => c.sourceFile))].sort();

    // Add current file option first if available
    if (this.currentFile) {
      const currentOpt = this.noteSelect.createEl('option', {
        text: `📄 ${t().deleteModal.currentNote(this.currentFile.basename)}`,
        attr: { value: this.currentFile.path }
      });
      currentOpt.selected = true;
    }

    sourceFiles.forEach(file => {
      if (file !== this.currentFile?.path) {
        const count = this.allCards.filter(c => c.sourceFile === file).length;
        const basename = file.split('/').pop() || file;
        this.noteSelect.createEl('option', {
          text: t().deleteModal.noteCards(basename, count),
          attr: { value: file }
        });
      }
    });

    this.noteSelect.onchange = () => this.updatePreview();

    // Date filter
    const dateFilterDiv = filterSection.createDiv({ cls: 'sil-filter-option sil-date-filter' });
    dateFilterDiv.createEl('label', { text: t().deleteModal.dateRange });

    const dateRow = dateFilterDiv.createDiv({ cls: 'sil-date-filter-row' });
    this.dateFromInput = dateRow.createEl('input', {
      attr: { type: 'date' },
      cls: 'sil-date-input-compact'
    });
    dateRow.createSpan({ text: t().review.dateSeparator });
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
    warning.innerHTML = `⚠️ ${t().deleteModal.warning}`;

    // Buttons
    const buttonRow = contentEl.createDiv({ cls: 'sil-modal-buttons-compact' });

    const cancelBtn = buttonRow.createEl('button', { text: t().common.cancel, cls: 'sil-btn-compact' });
    cancelBtn.onclick = () => this.close();

    const deleteBtn = buttonRow.createEl('button', { text: t().common.delete, cls: 'sil-btn-compact sil-btn-danger' });
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
      this.previewCount.innerHTML = `<span class="sil-preview-empty">${t().deleteModal.noCardsToDelete}</span>`;
    } else {
      this.previewCount.textContent = t().deleteModal.cardsWillBeDeleted(count);
    }
  }

  private handleDelete(): void {
    const cardsToDelete = this.getCardsToDelete();

    if (cardsToDelete.length === 0) {
      new Notice(t().deleteModal.noCardsToDelete);
      return;
    }

    if (!confirm(t().deleteModal.confirmDelete(cardsToDelete.length))) {
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
