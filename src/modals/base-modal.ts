import { Component, Modal } from 'obsidian';

import PDFReader from 'main';
import { PDFReaderLib } from 'lib';


export class PDFReaderModal extends Modal {
    plugin: PDFReader;
    lib: PDFReaderLib;
    component: Component;

    constructor(plugin: PDFReader) {
        super(plugin.app);
        this.plugin = plugin;
        this.lib = plugin.lib;
        this.component = new Component();
        this.contentEl.addClass('pdf-reader-modal');
    }

    onOpen() {
        this.component.load();
    }

    onClose() {
        this.contentEl.empty();
        this.component.unload();
    }
}
