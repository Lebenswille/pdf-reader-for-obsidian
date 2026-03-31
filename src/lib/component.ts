import { Component } from "obsidian";

import PDFReader from "main";

export class PDFReaderComponent extends Component {
	plugin: PDFReader;

	constructor(plugin: PDFReader) {
		super();
		this.plugin = plugin;
	}

	get app() {
		return this.plugin.app;
	}

	get lib() {
		return this.plugin.lib;
	}

	get settings() {
		return this.plugin.settings;
	}
}
