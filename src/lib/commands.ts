import { Command, Notice, TFile, WorkspaceLeaf, normalizePath } from "obsidian";

import { PDFReaderLibSubmodule } from "./submodule";
import { DummyFileModal } from "modals";
import { PDFOutlines } from "./outlines";
import { getObsidianDebugInfo, getStyleSettings, parsePDFSubpath } from "utils";
import { PDFReaderSettingTab } from "settings";
import { showContextMenuAtSelection } from "context-menu";

export class PDFReaderCommands extends PDFReaderLibSubmodule {
	commands: Record<string, Command>;

	constructor(...args: ConstructorParameters<typeof PDFReaderLibSubmodule>) {
		super(...args);

		const commandArray: Command[] = [
			{
				id: "sync-annotations",
				name: "Sync annotations from PDF to note",
				callback: () => this.lib.sync.syncAnnotations(),
			},
			{
				id: "copy-link-to-selection",
				name: "Copy link to selection or annotation",
				checkCallback: (checking) => this.copyLink(checking, false),
			},
			{
				id: "open-external",
				name: "Open this PDF in the original location",
				checkCallback: (checking) => this.openExternalSource(checking),
			},
		];

		this.commands = {};
		for (const command of commandArray) {
			this.commands[command.id] = command;
		}
	}

	getCommand(id: string): Command {
		return this.commands[id];
	}

	registerCommands() {
		Object.values(this.commands).forEach((command) => {
			this.plugin.addCommand(
				this.plugin.obsidianHasFocusBug ? this.restorePDFLeafFocus(command) : command,
			);
		});
	}

	restorePDFLeafFocus(command: Command): Command {
		const original = command.checkCallback;
		if (!original) return command;

		let activePDFLeaf: WorkspaceLeaf | null = null;

		return {
			...command,
			checkCallback: (checking: boolean) => {
				if (checking) {
					activePDFLeaf = this.lib.workspace.getActivePDFView()?.leaf ?? null;
					return original(checking);
				}
				if (activePDFLeaf && activePDFLeaf !== this.app.workspace.activeLeaf) {
					this.app.workspace.setActiveLeaf(activePDFLeaf, { focus: true });
					activePDFLeaf = null;
				}
				return original(checking);
			},
		};
	}

	copyLink(checking: boolean, autoPaste: boolean = false) {
		if (!checking) {
			const templateIndex = this.settings.defaultColorPaletteActionIndex;
			const template = this.settings.copyCommands[templateIndex].template;
			this.lib.copyLink.copyLinkToSelection(
				false,
				{ copyFormat: template },
				undefined,
				autoPaste,
			);
		}

		return true;
	}

	openExternalSource(checking: boolean) {
		const child = this.lib.getPDFViewerChild(true);
		const file = child?.file;
		if (!child || !child.isFileExternal || !file) return false;

		if (!checking) {
			(async () => {
				const url = (await this.app.vault.read(file)).trim();
				window.open(url, "_blank");
			})();
		}

		return true;
	}

	// Stub methods for missing modals
	_insertPage(file: TFile, page: number, basePage: number) {
		new Notice("Page insertion is currently disabled.");
	}

	_deletePage(file: TFile, page: number) {
		new Notice("Page deletion is currently disabled.");
	}

	_extractPage(file: TFile, page: number) {
		new Notice("Page extraction is currently disabled.");
	}

	_dividePDF(file: TFile, page: number) {
		new Notice("PDF division is currently disabled.");
	}

	createPDF() {
		new Notice("PDF creation is currently disabled.");
	}

	editPageLabels(checking: boolean) {
		if (checking) return false;
		new Notice("Page label editing is currently disabled.");
	}

	addOutlineItem(checking: boolean) {
		if (checking) return false;
		new Notice("Outline item addition is currently disabled.");
	}

	async copyDebugInfo() {
		const obsidianDebugInfo = await getObsidianDebugInfo(this.app);
		const settings = this.settings;
		const styleSettings = getStyleSettings(this.app);
		const styleSheet = this.plugin.domManager.styleEl.textContent;

		let text = "#### Obsidian debug info\n\n";
		for (const [key, value] of Object.entries(obsidianDebugInfo)) {
			if (Array.isArray(value)) {
				text += `- ${key}: ${value.length}\n`;
				value.forEach((item) => {
					text += `    - ${item}\n`;
				});
				continue;
			}
			text += `- ${key}: ${value}\n`;
		}
		text += "\n#### PDF Reader debug info\n\n";
		text += "```\n" + JSON.stringify({ settings, styleSettings, styleSheet }) + "\n```\n";

		await navigator.clipboard.writeText(text);
		new Notice(`${this.plugin.manifest.name}: Debug info copied to clipboard.`);
	}

	loadDebugInfo(checking: boolean) {
		if (!this.plugin.isDebugMode) return false;
		if (!checking) {
			(async () => {
				try {
					const { settings, styleSettings, styleSheet } = JSON.parse(
						await navigator.clipboard.readText(),
					);
					new Notice(`${this.plugin.manifest.name}: Debug info loaded from clipboard.`);
					this.plugin.settings = settings;
				} catch (err) {
					new Notice(`${this.plugin.manifest.name}: Debug info not found in clipboard.`);
				}
			})();
		}
		return true;
	}

	createDummyForExternalPDF() {
		new DummyFileModal(this.plugin).open();
	}

	showContextMenu(checking: boolean) {
		const child = this.lib.getPDFViewerChild(true);
		if (!child) return false;
		const doc = child.containerEl.doc;
		const selection = doc.getSelection();
		if (!selection || !selection.focusNode || selection.isCollapsed) return false;
		if (!checking) showContextMenuAtSelection(this.plugin, child, selection);
		return true;
	}

	showOutline(checking: boolean) {
		if (checking) return true;
		new Notice("Show outline command is stubbed.");
	}

	showThumbnail(checking: boolean) {
		if (checking) return true;
		new Notice("Show thumbnail command is stubbed.");
	}

	closeSidebar(checking: boolean) {
		if (checking) return true;
		new Notice("Close sidebar command is stubbed.");
	}
}
