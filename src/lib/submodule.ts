import { App } from 'obsidian';

import PDFReader from 'main';
import { PDFReaderLib } from 'lib';
import { PDFReaderSettings } from 'settings';


export class PDFReaderLibSubmodule {
    app: App;
    plugin: PDFReader;

    constructor(plugin: PDFReader) {
        this.app = plugin.app;
        this.plugin = plugin;
    }

    get lib(): PDFReaderLib {
        return this.plugin.lib;
    }

    get settings(): PDFReaderSettings {
        return this.plugin.settings;
    }
}
