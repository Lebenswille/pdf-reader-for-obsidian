import { Component } from "obsidian";

import { PDFReaderLibSubmodule } from "lib/submodule";
import { PDFPageView, PDFViewerChild, Rect } from "typings";

/** Adding text highlight in PDF viewers without writing into files */
export class ViewerHighlightLib extends PDFReaderLibSubmodule {
	getPDFReaderBacklinkHighlightLayer(pageView: PDFPageView): HTMLElement {
		const pageDiv = pageView.div;
		let layerEl = pageDiv.querySelector<HTMLElement>("div.pdf-reader-backlink-highlight-layer");
		if (!layerEl) {
			layerEl = pageDiv.createDiv("pdf-reader-backlink-highlight-layer");
		}
		// Always update dimensions to match current zoom/viewport
		window.pdfjsLib.setLayerDimensions(layerEl as HTMLDivElement, pageView.viewport);
		return layerEl;
	}

	placeRectInPage(rect: Rect, page: PDFPageView) {
		// Use viewport to convert PDF coordinates to scaled viewport coordinates
		const viewport = page.viewport;
		const [x1, y1, x2, y2] = viewport.convertToViewportRectangle(rect);

		const layerEl = this.getPDFReaderBacklinkHighlightLayer(page);
		const rectEl = layerEl.createDiv("pdf-reader-backlink");

		// Since we used setLayerDimensions on layerEl with the same viewport,
		// we can set the coordinates directly in pixels relative to the layer.
		rectEl.setCssStyles({
			left: `${Math.min(x1, x2)}px`,
			top: `${Math.min(y1, y2)}px`,
			width: `${Math.abs(x2 - x1)}px`,
			height: `${Math.abs(y2 - y1)}px`,
		});

		return rectEl;
	}

	/**
	 * Render highlighting DOM elements for `subpathHighlight` of the given `child`.
	 * `subpathHighlight` must be set by `child.applySubpath` before calling this method.
	 *
	 * @param child
	 * @param duration The duration in seconds to highlight the subpath. If it's 0, the highlight will not be removed until the user clicks on the page.
	 */
	highlightSubpath(child: PDFViewerChild, duration: number) {
		if (child.subpathHighlight?.type === "text") {
			const component = new Component();
			component.load();

			this.lib.onTextLayerReady(child.pdfViewer, component, (pageNumber) => {
				if (child.subpathHighlight?.type !== "text") return;
				const { page, range } = child.subpathHighlight;
				if (page !== pageNumber) return;

				child.highlightText(page, range);
				if (duration > 0) {
					setTimeout(() => {
						child.clearTextHighlight();
					}, duration * 1000);
				}

				component.unload();
			});
		} else if (child.subpathHighlight?.type === "annotation") {
			const component = new Component();
			component.load();

			this.lib.onAnnotationLayerReady(child.pdfViewer, component, (pageNumber) => {
				if (child.subpathHighlight?.type !== "annotation") return;
				const { page, id } = child.subpathHighlight;
				if (page !== pageNumber) return;

				child.highlightAnnotation(page, id);
				if (duration > 0)
					setTimeout(() => child.clearAnnotationHighlight(), duration * 1000);

				component.unload();
			});
		} else if (child.subpathHighlight?.type === "rect") {
			const component = new Component();
			component.load();

			this.lib.onPageReady(child.pdfViewer, component, (pageNumber) => {
				if (child.subpathHighlight?.type !== "rect") return;

				const { page, rect } = child.subpathHighlight;
				if (page !== pageNumber) return;

				this.highlightRect(child, page, rect);
				if (duration > 0) {
					setTimeout(() => {
						this.clearRectHighlight(child);
					}, duration * 1000);
				}

				component.unload();
			});
		}
	}

	/**
	 * The counterpart of `PDFViewerChild.prototype.highlightText` and `PDFViewerChild.prototype.highlightAnnotation`
	 * for rectangular selections.
	 */
	highlightRect(child: PDFViewerChild, page: number, rect: Rect) {
		this.clearRectHighlight(child);

		if (1 <= page && page <= child.pdfViewer.pagesCount) {
			const pageView = child.getPage(page);
			if (pageView?.div.dataset.loaded) {
				child.rectHighlight = this.placeRectInPage(rect, pageView);
				child.rectHighlight.addClass("rect-highlight");

				// If `zoomToFitRect === true`, it will be handled by `PDFViewerChild.prototype.applySubpath` as a FitR destination.
				if (!this.settings.zoomToFitRect) {
					activeWindow.setTimeout(() => {
						window.pdfjsViewer.scrollIntoView(child.rectHighlight, {
							top: -this.settings.embedMargin,
						});
					});
				}
			}
		}
	}

	/**
	 * The counterpart of `PDFViewerChild.prototype.clearTextHighlight` and `PDFViewerChild.prototype.clearAnnotationHighlight`
	 * for rectangular selections.
	 */
	clearRectHighlight(child: PDFViewerChild) {
		if (child.rectHighlight) {
			child.rectHighlight.detach();
			child.rectHighlight = null;
		}
	}
}
