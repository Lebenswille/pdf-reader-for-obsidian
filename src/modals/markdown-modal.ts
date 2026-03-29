import { MarkdownRenderer } from 'obsidian';
import { PDFReaderModal } from './base-modal';
import PDFReader from 'main';


export class MarkdownModal extends PDFReaderModal {
    markdown: string = '';

    static renderAsModal(plugin: PDFReader, markdown: string) {
        const modal = new MarkdownModal(plugin);
        modal.markdown = markdown;
        modal.open();
        return modal;
    }

    onOpen() {
        MarkdownRenderer.render(
            this.app,
            this.markdown,
            this.contentEl.createDiv('markdown-rendered'),
            '',
            this.component
        );
    }
}
