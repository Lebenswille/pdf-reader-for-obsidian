import { TFile, parseLinktext, RGB } from "obsidian";
import { PDFBacklinkCache } from "./pdf-backlink-index";
import { PDFReaderLibSubmodule } from "./submodule";
import { hexToRgb } from "utils";

export class LinkUpdater extends PDFReaderLibSubmodule {
	private getNamedColorForRgb(rgb: RGB): string | null {
		for (const [name, hex] of Object.entries(this.settings.colors)) {
			const namedRgb = hexToRgb(hex);
			if (
				namedRgb &&
				namedRgb.r === rgb.r &&
				namedRgb.g === rgb.g &&
				namedRgb.b === rgb.b
			) {
				return name;
			}
		}
		return null;
	}

	private updateCalloutColorInLine(line: string, colorName: string | null): string {
		const escapedType = this.settings.calloutType.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		const calloutRegex = new RegExp(`(\\[!${escapedType})(?:\\|[^\\]\\r\\n]+)?(\\])`, "i");

		return line.replace(calloutRegex, (_match, prefix: string, suffix: string) => {
			return colorName ? `${prefix}|${colorName.toLowerCase()}${suffix}` : `${prefix}${suffix}`;
		});
	}

	async updateLinkColor(
		cache: PDFBacklinkCache,
		color: { type: "rgb"; rgb: RGB } | { type: "name"; name: string } | null,
	) {
		if (!("position" in cache.refCache)) return;
		const pos = cache.refCache.position;

		const file = this.app.vault.getAbstractFileByPath(cache.sourcePath);
		if (!(file instanceof TFile)) return;

		await this.app.vault.process(file, (content) => {
			const rawLink = content.substring(pos.start.offset, pos.end.offset);

			const { path, subpath } = parseLinktext(cache.refCache.link);
			const params = new URLSearchParams(
				subpath.startsWith("#") ? subpath.slice(1) : subpath,
			);

			if (color === null) {
				params.delete("color");
			} else if (color.type === "name") {
				params.set("color", color.name);
			} else {
				params.set("color", `${color.rgb.r},${color.rgb.g},${color.rgb.b}`);
			}

			const newSubpath = params.toString();
			const newLinkText = path + (newSubpath ? "#" + newSubpath : "");
			const updatedRawLink = rawLink.replace(cache.refCache.link, newLinkText);
			const lineStart = content.lastIndexOf("\n", pos.start.offset) + 1;
			const lineEnd = content.indexOf("\n", pos.end.offset);
			const safeLineEnd = lineEnd === -1 ? content.length : lineEnd;
			const originalLine = content.substring(lineStart, safeLineEnd);
			const updatedLineWithLink =
				originalLine.substring(0, pos.start.offset - lineStart) +
				updatedRawLink +
				originalLine.substring(pos.end.offset - lineStart);
			const calloutColorName =
				color === null
					? null
					: color.type === "name"
						? color.name
						: this.getNamedColorForRgb(color.rgb);
			const updatedLine = this.updateCalloutColorInLine(
				updatedLineWithLink,
				calloutColorName,
			);

			return (
				content.substring(0, lineStart) +
				updatedLine +
				content.substring(safeLineEnd)
			);
		});
	}

	async deleteLink(cache: PDFBacklinkCache) {
		if (!("position" in cache.refCache)) return;
		const pos = cache.refCache.position;

		const file = this.app.vault.getAbstractFileByPath(cache.sourcePath);
		if (!(file instanceof TFile)) return;

		await this.app.vault.process(file, (content) => {
			const start = pos.start.offset;
			const end = pos.end.offset;

			const lineStart = content.lastIndexOf("\n", start) + 1;
			const lineEnd = content.indexOf("\n", end);
			const before = content.substring(lineStart, start);
			const after = content.substring(end, lineEnd === -1 ? content.length : lineEnd);

			if (before.trim() === "" && after.trim() === "") {
				return (
					content.substring(0, lineStart) +
					content.substring(lineEnd === -1 ? content.length : lineEnd + 1)
				);
			}

			return content.substring(0, start) + content.substring(end);
		});
	}
}
