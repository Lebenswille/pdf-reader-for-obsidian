import { Component, setIcon, setTooltip } from "obsidian";
import PDFReader from "main";
import { PDFViewerChild } from "typings";
import { getEventCoords, isTargetHTMLElement } from "utils";
import { ColorPalette } from "color-palette";

export class SelectionToolbar extends Component {
	static readonly CLS = "pdf-reader-selection-toolbar";
	toolbarEl: HTMLElement;
	child: PDFViewerChild;
	plugin: PDFReader;
	comment: string = "";
	cachedSelection: any = null;

	constructor(plugin: PDFReader, child: PDFViewerChild) {
		super();
		this.plugin = plugin;
		this.child = child;
	}

	onload() {
		const doc = this.child.containerEl.doc;
		this.toolbarEl = doc.body.createDiv(SelectionToolbar.CLS);
		this.hide();
		this.render();
	}

	onunload() {
		this.toolbarEl?.remove();
	}

	reset() {
		this.comment = "";
		this.render();
	}

	render() {
		this.toolbarEl.empty();

		// Add "No color" button
		this.addButton(null, "transparent");

		// Add colors from settings
		for (const [name, hex] of Object.entries(this.plugin.settings.colors)) {
			this.addButton(name, hex);
		}

		// Add "Open associated note" button (Source icon) / Comment input
		this.addSourceButton();
	}

	addSourceButton() {
		const container = this.toolbarEl.createDiv(SelectionToolbar.CLS + "-source-container");

		const itemEl = container.createDiv({
			cls: [SelectionToolbar.CLS + "-item", "clickable-icon", "source-note-item"],
		});

		setIcon(itemEl, "file-text");
		setTooltip(itemEl, "Add comment & Sync");

		const inputEl = container.createEl("input", {
			cls: SelectionToolbar.CLS + "-comment-input",
			attr: { type: "text", placeholder: "Add a thought..." },
		});
		inputEl.value = this.comment;
		inputEl.style.display = this.comment ? "block" : "none";

		inputEl.addEventListener("input", () => {
			this.comment = inputEl.value;
		});

		inputEl.addEventListener("keydown", (evt) => {
			if (evt.key === "Enter") {
				// Clicking Enter acts like clicking the default "No color" (transparent) mark
				this.handleMark(null);
			}
		});

		itemEl.addEventListener("click", (evt) => {
			if (inputEl.style.display === "none") {
				inputEl.style.display = "block";
				inputEl.focus();
			} else {
				// If already shown and clicked again without color, just sync as is
				this.handleMark(null);
			}
			evt.preventDefault();
			evt.stopPropagation();
		});
	}

	addButton(name: string | null, color: string) {
		const itemEl = this.toolbarEl.createDiv({
			cls: [SelectionToolbar.CLS + "-item", "clickable-icon"],
			attr: { "data-highlight-color": name ? name.toLowerCase() : "transparent" },
		});

		const innerEl = itemEl.createDiv(SelectionToolbar.CLS + "-item-inner");
		if (name) {
			innerEl.style.backgroundColor = color;
		}

		itemEl.addEventListener("click", (evt) => {
			this.handleMark(name);
			evt.preventDefault();
			evt.stopPropagation();
		});
	}

	handleMark(colorName: string | null) {
		// Reset comment and input manually after syncing if needed, but usually we hide() which does it
		const template =
			this.plugin.settings.copyCommands[this.plugin.settings.defaultColorPaletteActionIndex]
				.template;

		const commentToUse = (this.comment || "").trim();

		const writeFile = this.child.palette?.writeFile ?? false;
		if (writeFile) {
			this.plugin.lib.copyLink.writeHighlightAnnotationToSelectionIntoFileAndCopyLink(
				false,
				{ copyFormat: template },
				colorName ?? undefined,
				true,
				commentToUse,
			);
		} else {
			this.plugin.lib.copyLink.copyLinkToSelection(
				false,
				{ copyFormat: template },
				colorName ?? undefined,
				true,
				commentToUse,
			);
		}

		this.hide();
	}

	show(evt: MouseEvent) {
		const win = evt.view ?? this.child.containerEl.win;
		const selection = win.getSelection();
		if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;

		// PRE-CAPTURE selection data here before focus shifts to the input!
		// This hydrates the cache in copyLink.
		this.plugin.lib.copyLink.getTemplateVariables({});

		const range = selection.getRangeAt(0);
		const rect = range.getBoundingClientRect();

		// Reveal it first to get dimensions
		this.toolbarEl.style.opacity = "0";
		this.toolbarEl.style.display = "flex";

		// Position centering above selection
		const toolbarRect = this.toolbarEl.getBoundingClientRect();

		let top = rect.top - toolbarRect.height - 12;
		let left = rect.left + rect.width / 2 - toolbarRect.width / 2;

		// Adjust constraints
		if (top < 10) top = rect.bottom + 12;
		if (left < 10) left = 10;
		if (left + toolbarRect.width > win.innerWidth - 10)
			left = win.innerWidth - toolbarRect.width - 10;

		this.toolbarEl.style.top = `${top}px`;
		this.toolbarEl.style.left = `${left}px`;
		this.toolbarEl.style.opacity = "1";
	}

	hide() {
		if (this.toolbarEl) {
			this.toolbarEl.style.display = "none";
			this.comment = ""; // Reset comment on hide
			const input = this.toolbarEl.querySelector("input");
			if (input) {
				input.value = "";
				input.style.display = "none";
			}
		}
	}
}
