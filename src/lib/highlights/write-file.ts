import { TFile, Notice, RGB } from "obsidian";
import {
	PDFDocument,
	PDFDict,
	PDFName,
	PDFRef,
	PDFArray,
	PDFNumber,
	PDFHexString,
	PDFString,
} from "@cantoo/pdf-lib";
import PDFReader from "main";
import { PDFReaderLibSubmodule } from "../submodule";
import { PDFViewerChild } from "typings";

export class AnnotationWriteFileLib extends PDFReaderLibSubmodule {
	async getAnnotation(file: TFile, pageNumber: number, id: string): Promise<PDFDict | null> {
		const buffer = await this.app.vault.readBinary(file);
		const doc = await PDFDocument.load(buffer);
		const page = doc.getPages()[pageNumber - 1];
		const annots = page.node.get(PDFName.of("Annots"));
		if (!(annots instanceof PDFArray)) return null;

		for (let i = 0; i < annots.size(); i++) {
			const annotRef = annots.get(i);
			if (!(annotRef instanceof PDFRef)) continue;

			// Check if this ref matches the ID (which is usually like '123R')
			if (annotRef.toString() === id) {
				const annot = doc.context.lookup(annotRef);
				if (annot instanceof PDFDict) return annot;
			}
		}
		return null;
	}

	async processAnnotation(
		file: TFile,
		pageNumber: number,
		id: string,
		callback: (annot: PDFDict, doc: PDFDocument) => Promise<void> | void,
	) {
		const buffer = await this.app.vault.readBinary(file);
		const doc = await PDFDocument.load(buffer);
		const page = doc.getPages()[pageNumber - 1];
		const annots = page.node.get(PDFName.of("Annots"));
		if (!(annots instanceof PDFArray)) {
			new Notice("No annotations found on this page.");
			return;
		}

		let found = false;
		for (let i = 0; i < annots.size(); i++) {
			const annotRef = annots.get(i);
			if (!(annotRef instanceof PDFRef)) continue;

			if (annotRef.toString() === id) {
				const annot = doc.context.lookup(annotRef);
				if (annot instanceof PDFDict) {
					await callback(annot, doc);
					found = true;
					break;
				}
			}
		}

		if (found) {
			const newBuffer = await doc.save();
			await this.app.vault.modifyBinary(
				file,
				newBuffer.buffer.slice(
					newBuffer.byteOffset,
					newBuffer.byteOffset + newBuffer.byteLength,
				) as ArrayBuffer,
			);
		} else {
			new Notice("Annotation not found in the PDF file.");
		}
	}

	async deleteAnnotation(file: TFile, pageNumber: number, id: string) {
		const buffer = await this.app.vault.readBinary(file);
		const doc = await PDFDocument.load(buffer);
		const page = doc.getPages()[pageNumber - 1];
		const annots = page.node.get(PDFName.of("Annots"));
		if (!(annots instanceof PDFArray)) return;

		let indexToRemove = -1;
		for (let i = 0; i < annots.size(); i++) {
			const annotRef = annots.get(i);
			if (annotRef instanceof PDFRef && annotRef.toString() === id) {
				indexToRemove = i;
				break;
			}
		}

		if (indexToRemove !== -1) {
			annots.remove(indexToRemove);
			const newBuffer = await doc.save();
			await this.app.vault.modifyBinary(
				file,
				newBuffer.buffer.slice(
					newBuffer.byteOffset,
					newBuffer.byteOffset + newBuffer.byteLength,
				) as ArrayBuffer,
			);
		}
	}

	setColorToAnnotation(annot: PDFDict, rgb: RGB) {
		const color = PDFArray.withContext(annot.context);
		color.push(PDFNumber.of(rgb.r / 255));
		color.push(PDFNumber.of(rgb.g / 255));
		color.push(PDFNumber.of(rgb.b / 255));
		annot.set(PDFName.of("C"), color);
	}

	getColorFromAnnotation(annot: PDFDict): RGB | null {
		const color = annot.get(PDFName.of("C"));
		if (color instanceof PDFArray && color.size() === 3) {
			const r = color.get(0);
			const g = color.get(1);
			const b = color.get(2);
			if (r instanceof PDFNumber && g instanceof PDFNumber && b instanceof PDFNumber) {
				return {
					r: Math.round(r.asNumber() * 255),
					g: Math.round(g.asNumber() * 255),
					b: Math.round(b.asNumber() * 255),
				};
			}
		}
		return null;
	}

	setOpacityToAnnotation(annot: PDFDict, opacity: number) {
		annot.set(PDFName.of("CA"), PDFNumber.of(opacity));
	}

	getOpacityFromAnnotation(annot: PDFDict): number | null {
		const opacity = annot.get(PDFName.of("CA"));
		return opacity instanceof PDFNumber ? opacity.asNumber() : null;
	}

	setBorderWidthToAnnotation(annot: PDFDict, width: number) {
		const border = PDFArray.withContext(annot.context);
		border.push(PDFNumber.of(0));
		border.push(PDFNumber.of(0));
		border.push(PDFNumber.of(width));
		annot.set(PDFName.of("Border"), border);
	}

	getBorderWidthFromAnnotation(annot: PDFDict): number | null {
		const border = annot.get(PDFName.of("Border"));
		if (border instanceof PDFArray && border.size() >= 3) {
			const width = border.get(2);
			return width instanceof PDFNumber ? width.asNumber() : null;
		}
		return null;
	}

	setAuthorToAnnotation(annot: PDFDict, author: string) {
		annot.set(PDFName.of("T"), PDFHexString.fromText(author));
	}

	getAuthorFromAnnotation(annot: PDFDict): string | null {
		const author = annot.get(PDFName.of("T"));
		if (author instanceof PDFHexString || author instanceof PDFString) {
			return author.decodeText();
		}
		return null;
	}

	setContentsToAnnotation(annot: PDFDict, contents: string) {
		annot.set(PDFName.of("Contents"), PDFHexString.fromText(contents));
	}

	getContentsFromAnnotation(annot: PDFDict): string | null {
		const contents = annot.get(PDFName.of("Contents"));
		if (contents instanceof PDFHexString || contents instanceof PDFString) {
			return contents.decodeText();
		}
		return null;
	}

	async addTextMarkupAnnotationToSelection(
		subtype: "Highlight" | "Underline" | "StrikeOut" | "Squiggly",
		colorName?: string,
		comment?: string,
	) {
		const selection = activeWindow.getSelection();
		if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null;

		const range = selection.getRangeAt(0);
		const pageEl = this.lib.getPageElFromSelection(selection);
		if (!pageEl || !pageEl.dataset.pageNumber) return null;

		const pageNumber = +pageEl.dataset.pageNumber;
		const child = this.lib.getPDFViewerChildAssociatedWithNode(pageEl);
		if (!child || !child.file) return null;

		const pageView = child.getPage(pageNumber);
		const textLayer = pageView.textLayer;
		if (!textLayer) return null;

		const textLayerInfo = this.lib.utils.getTextLayerInfo(textLayer);
		if (!textLayerInfo) return null;

		const textSelectionRange = this.lib.copyLink.getTextSelectionRange(pageEl, selection);
		if (!textSelectionRange) return null;

		const { beginIndex, beginOffset, endIndex, endOffset } = textSelectionRange;
		const mergedRects = this.lib.highlight.geometry.computeMergedHighlightRects(
			textLayerInfo,
			beginIndex,
			beginOffset,
			endIndex,
			endOffset,
		);
		if (mergedRects.length === 0) return null;

		const rects = mergedRects.map((m) => m.rect);
		const quadPoints = this.lib.highlight.geometry.rectsToQuadPoints(rects);
		const boundingBox = this.lib.highlight.geometry.mergeRectangles(...rects);

		const buffer = await this.app.vault.readBinary(child.file);
		const doc = await PDFDocument.load(buffer);
		const page = doc.getPages()[pageNumber - 1];

		const annot = doc.context.obj({
			Type: "Annot",
			Subtype: subtype,
			Rect: boundingBox,
			QuadPoints: quadPoints,
			Contents: PDFHexString.fromText(comment || ""),
			T: PDFHexString.fromText(this.app.vault.getName() || "Obsidian"),
			CreationDate: PDFString.fromDate(new Date()),
			M: PDFString.fromDate(new Date()),
		});

		if (colorName) {
			const rgb = this.plugin.domManager.getRgb(colorName);
			if (rgb) {
				const colorArray = doc.context.obj([rgb.r / 255, rgb.g / 255, rgb.b / 255]);
				(annot as PDFDict).set(PDFName.of("C"), colorArray);
			}
		}

		// Add default opacity for highlights
		if (subtype === "Highlight") {
			(annot as PDFDict).set(PDFName.of("CA"), PDFNumber.of(0.5));
		}

		const annotRef = doc.context.register(annot);
		let annots = page.node.get(PDFName.of("Annots"));
		if (!(annots instanceof PDFArray)) {
			annots = doc.context.obj([]);
			page.node.set(PDFName.of("Annots"), annots);
		}
		(annots as PDFArray).push(annotRef);

		const newBuffer = await doc.save();
		await this.app.vault.modifyBinary(
			child.file,
			newBuffer.buffer.slice(
				newBuffer.byteOffset,
				newBuffer.byteOffset + newBuffer.byteLength,
			) as ArrayBuffer,
		);

		return {
			child,
			file: child.file,
			page: pageNumber,
			annotationID: annotRef.toString(),
			rects,
		};
	}
}
