import { MarkdownView, TFile, Notice, parseLinktext, TFolder, normalizePath } from "obsidian";
import { PDFReaderLibSubmodule } from "./submodule";
import PDFReader from "main";
import { PDFView } from "typings";

export class PDFReaderSync extends PDFReaderLibSubmodule {
	constructor(plugin: PDFReader) {
		super(plugin);
	}

	init() {
		console.log("PDF Reader: PDFReaderSync initialized");
		this.registerHeaderButton();
		this.registerSideBarIcon();
		// Remove automatic note creation on PDF open

		// Listen for PDF file modifications to trigger sync
		this.plugin.registerEvent(
			this.app.vault.on("modify", async (file) => {
				if (this.settings.autoSync && file instanceof TFile && file.extension === "pdf") {
					const noteFile = await this.getNoteFileFromPDF(file);
					if (noteFile) {
						await this.syncFromPDFToNote(file, noteFile);
					}
				}
			}),
		);
	}

	async ensureNoteForPDF(pdfFile: TFile): Promise<TFile | null> {
		let noteFile = await this.getNoteFileFromPDF(pdfFile);
		if (noteFile) return noteFile;

		// Double check target folder
		const targetFolder = normalizePath(this.settings.newPDFFolderPath || "References");
		const fullPath = normalizePath(targetFolder + "/" + pdfFile.basename + ".md");
		const existingFile = this.app.vault.getAbstractFileByPath(fullPath);
		if (existingFile instanceof TFile) return existingFile;

		if (this.settings.warnBeforeCreateNote) {
			return new Promise(async (resolve) => {
				const { ConfirmModal } = await import("../modals/confirm-modal");
				new ConfirmModal(
					this.plugin,
					`Create associated note?`,
					async () => {
						const created = await this.createNoteForPDF(pdfFile);
						resolve(created);
					},
					{
						subMessage: `No associated note found for "${pdfFile.name}". Create one in "${targetFolder}"?`,
						confirmText: "Create",
						cancelText: "Skip",
						onCancel: () => resolve(null),
					},
				).open();
			});
		} else {
			return await this.createNoteForPDF(pdfFile);
		}
	}

	async createNoteForPDF(pdfFile: TFile): Promise<TFile | null> {
		const templatePath = this.settings.newFileTemplatePath;
		const targetFolder = normalizePath(this.settings.newPDFFolderPath || "References");
		const propName = this.settings.proxyMDProperty || "source";

		let content = "";
		if (templatePath) {
			const templateFile = this.app.vault.getAbstractFileByPath(templatePath);
			if (templateFile instanceof TFile) {
				content = await this.app.vault.read(templateFile);
				content = content.replace(/{{title}}/g, pdfFile.basename);
				content = content.replace(/{{pdf}}/g, `[[${pdfFile.path}]]`);
			}
		}

		// Add the source property if not present in content
		if (!content.includes(`${propName}:`)) {
			if (content.startsWith("---")) {
				const parts = content.split("---");
				// Insert into frontmatter
				parts[1] = `\n${propName}: "[[${pdfFile.path}]]"\n` + parts[1];
				content = parts.join("---");
			} else {
				content = `---\n${propName}: "[[${pdfFile.path}]]"\n---\n\n` + content;
			}
		}

		// Recursive folder creation
		const folders = targetFolder.split("/");
		let currentPath = "";
		for (const f of folders) {
			if (!f) continue;
			currentPath = normalizePath(currentPath ? currentPath + "/" + f : f);
			const folder = this.app.vault.getAbstractFileByPath(currentPath);
			if (!(folder instanceof TFolder)) {
				await this.app.vault.createFolder(currentPath).catch(() => {});
			}
		}

		const fullPath = normalizePath(targetFolder + "/" + pdfFile.basename + ".md");
		const existing = this.app.vault.getAbstractFileByPath(fullPath);
		if (!existing) {
			const created = await this.app.vault.create(fullPath, content);
			new Notice(`PDF Reader: Created associated note for "${pdfFile.name}"`);
			return created;
		}
		return existing instanceof TFile ? existing : null;
	}

	async getNoteFileFromPDF(pdfFile: TFile): Promise<TFile | null> {
		const propNames = [this.settings.proxyMDProperty, "source"].filter(Boolean);
		const files = this.app.vault.getMarkdownFiles();
		for (const file of files) {
			const cache = this.app.metadataCache.getFileCache(file);

			for (const propName of propNames) {
				let path = "";
				if (cache?.frontmatterLinks) {
					const fmLink = cache.frontmatterLinks.find(
						(l: any) => l.key.split(".")[0] === propName,
					);
					if (fmLink) path = parseLinktext(fmLink.link).path;
				}

				if (!path && cache?.frontmatter) {
					const source = cache.frontmatter[propName];
					if (source) {
						let linkText = "";
						if (typeof source === "string") {
							linkText = source;
						} else if (Array.isArray(source) && source.length > 0) {
							if (Array.isArray(source[0])) linkText = String(source[0][0]);
							else linkText = String(source[0]);
						} else {
							linkText = String(source);
						}
						if (linkText.startsWith("[[") && linkText.endsWith("]]")) {
							linkText = linkText.slice(2, -2).split("|")[0];
						}
						path = parseLinktext(linkText).path;
					}
				}

				if (path) {
					const linkedFile = this.app.metadataCache.getFirstLinkpathDest(path, file.path);
					if (linkedFile === pdfFile) return file;
				}
			}
		}
		return null;
	}

	private static readonly HEADER_BTN_CLASS = "pdf-reader-open-source-btn";

	private registerHeaderButton() {
		this.app.workspace.onLayoutReady(() => {
			this.refreshHeaderButton();

			this.plugin.registerEvent(
				this.app.workspace.on("active-leaf-change", () => {
					this.refreshHeaderButton();
				}),
			);

			this.plugin.registerEvent(
				this.app.workspace.on("file-open", () => {
					this.refreshHeaderButton();
				}),
			);
		});
	}

	private registerSideBarIcon() {
		this.plugin.addRibbonIcon("file-text", "Open source PDF", async () => {
			const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
			if (activeView && activeView.file) {
				const pdfFile = await this.getPDFFileFromNote(activeView.file);
				if (pdfFile) {
					this.openPDF(pdfFile);
				} else {
					new Notice("PDF Reader: No source PDF found for the current note.");
				}
			} else {
				new Notice("PDF Reader: Please open a note to view its source PDF.");
			}
		});
	}

	private async refreshHeaderButton() {
		const leaf = this.app.workspace.activeLeaf;
		if (!leaf) return;
		const view = leaf.view;

		if (!(view instanceof MarkdownView) || !view.file) {
			// Remove any existing buttons if the view is not valid or has no file
			view.containerEl
				.querySelectorAll(
					`.${PDFReaderSync.HEADER_BTN_CLASS}, .view-action[aria-label^="Open source PDF"]`,
				)
				.forEach((el: Element) => el.remove());
			return;
		}

		const pdfFile = await this.getPDFFileFromNote(view.file);

		// Remove old buttons synchronously, immediately before adding the new one.
		// This prevents race conditions where multiple overlapping calls could duplicate buttons.
		// We look both in view.containerEl and its parent, to cover all possible DOM structures,
		// and also clean up any buttons matching the aria-label to clear stale instances from previous plugin unloads.
		const parentEl = view.containerEl.parentElement || view.containerEl;
		parentEl
			.querySelectorAll(
				`.${PDFReaderSync.HEADER_BTN_CLASS}, .view-action[aria-label^="Open source PDF"]`,
			)
			.forEach((el: Element) => el.remove());

		if (!pdfFile) return;

		const btnEl = view.addAction("file-text", `Open source PDF: ${pdfFile.basename}`, () => {
			this.openPDF(pdfFile);
		});
		btnEl.addClass(PDFReaderSync.HEADER_BTN_CLASS);
	}

	private openPDF(file: TFile) {
		const existingLeaf = this.lib.workspace.getExistingLeafForPDFFile(file);
		if (existingLeaf) {
			this.app.workspace.setActiveLeaf(existingLeaf, { focus: true });
		} else {
			const leaf = this.app.workspace.getLeaf(true);
			leaf.openFile(file);
		}
	}

	async syncAnnotations() {
		let pdfFile: TFile | null = null;
		let noteFile: TFile | null = null;

		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (activeView && activeView.file) {
			pdfFile = await this.getPDFFileFromNote(activeView.file);
			noteFile = activeView.file;
		}

		if (!pdfFile) {
			const pdfView = this.lib.getPDFView(true);
			if (pdfView && (pdfView as any).viewer?.child?.file) {
				pdfFile = (pdfView as any).viewer.child.file;
				noteFile = await this.ensureNoteForPDF(pdfFile!);
			}
		}

		if (pdfFile && noteFile) {
			await this.syncFromPDFToNote(pdfFile, noteFile);
		} else {
			new Notice("PDF Reader: No associated PDF or note found for syncing.");
		}
	}

	async getPDFFileFromNote(noteFile: TFile): Promise<TFile | null> {
		const cache = this.app.metadataCache.getFileCache(noteFile);
		const propNames = [this.settings.proxyMDProperty, "source"].filter(Boolean);

		for (const propName of propNames) {
			let path = "";
			if (cache?.frontmatterLinks) {
				const fmLink = cache.frontmatterLinks.find(
					(l: any) => l.key.split(".")[0] === propName,
				);
				if (fmLink) path = parseLinktext(fmLink.link).path;
			}

			if (!path && cache?.frontmatter) {
				const source = cache.frontmatter[propName];
				if (source) {
					let linkText = "";
					if (typeof source === "string") {
						linkText = source;
					} else if (Array.isArray(source) && source.length > 0) {
						if (Array.isArray(source[0])) linkText = String(source[0][0]);
						else linkText = String(source[0]);
					} else {
						linkText = String(source);
					}
					if (linkText.startsWith("[[") && linkText.endsWith("]]")) {
						linkText = linkText.slice(2, -2).split("|")[0];
					}
					path = parseLinktext(linkText).path;
				}
			}

			if (path) {
				const file = this.app.metadataCache.getFirstLinkpathDest(path, noteFile.path);
				if (file instanceof TFile && file.extension === "pdf") return file;
			}
		}
		return null;
	}

	async syncFromPDFToNote(pdfFile: TFile, noteFile: TFile) {
		new Notice(`PDF Reader: Syncing annotations from "${pdfFile.name}"...`);
		try {
			const doc = await this.lib.loadPDFDocument(pdfFile);
			const highlights = await this.lib.highlight.extract.getAnnotatedTextsInDocument(doc);
			const content = await this.app.vault.read(noteFile);
			let newMarkdownContent = "";
			let addedCount = 0;

			let child: any = null;
			this.app.workspace.iterateAllLeaves((leaf) => {
				if (this.lib.isPDFView(leaf.view)) {
					const c = (leaf.view as any).viewer?.child;
					if (c && c.file?.path === pdfFile.path) child = c;
				}
			});

			// Use the template configured in settings for link copying to ensure consistency
			const copyCommand =
				this.settings.copyCommands[this.settings.defaultColorPaletteActionIndex] ||
				this.settings.copyCommands[0];
			const template = copyCommand.template;

			const pages = Array.from(highlights.keys()).sort((a, b) => a - b);
			for (const pageNumber of pages) {
				const resultsInPage = highlights.get(pageNumber);
				if (!resultsInPage) continue;

				for (const [id, info] of resultsInPage) {
					const { text, rgb, comment, rects } = info;
					const color = rgb ? `${rgb.r},${rgb.g},${rgb.b}` : "yellow";
					const annotIDQuery = `annotation=${id}`;

					if (!content.includes(annotIDQuery)) {
						const helperChild =
							child ||
							(this.app.workspace.getLeavesOfType("pdf").first()?.view as any)?.[
								"viewer"
							]?.["child"];
						let callout = this.lib.copyLink.getTextToCopy(
							helperChild,
							template,
							undefined,
							pdfFile,
							pageNumber,
							`#page=${pageNumber}&annotation=${id}`,
							text,
							color,
							undefined,
							comment,
						);

						// Ensure callouts end with a blank line to break the cursor out of the callout block
						if (callout.trimStart().startsWith(">")) {
							if (!callout.endsWith("\n\n")) {
								callout += callout.endsWith("\n") ? "\n" : "\n\n";
							}
						}

						newMarkdownContent += (newMarkdownContent ? "\n" : "\n") + callout;
						addedCount++;
					}
				}
			}

			if (addedCount > 0) {
				const finalContent =
					content + (content.endsWith("\n") ? "" : "\n") + newMarkdownContent;
				await this.app.vault.modify(noteFile, finalContent);
				new Notice(`PDF Reader: Synced ${addedCount} new annotations.`);
			} else {
				new Notice(`PDF Reader: No new annotations to sync.`);
			}
		} catch (error) {
			console.error("PDF Reader Sync error:", error);
		}
	}
}
