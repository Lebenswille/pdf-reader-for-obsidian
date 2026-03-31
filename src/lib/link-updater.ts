import { TFile, parseLinktext, RGB } from "obsidian";
import { PDFBacklinkCache } from "./pdf-backlink-index";
import { PDFReaderLibSubmodule } from "./submodule";

export class LinkUpdater extends PDFReaderLibSubmodule {
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

			return (
				content.substring(0, pos.start.offset) +
				updatedRawLink +
				content.substring(pos.end.offset)
			);
		});
	}

	async deleteLink(cache: PDFBacklinkCache) {
		if (!("position" in cache.refCache)) return;
		const pos = cache.refCache.position;

		const file = this.app.vault.getAbstractFileByPath(cache.sourcePath);
		if (!(file instanceof TFile)) return;

		await this.app.vault.process(file, (content) => {
			// Optional: check if the line is empty after deletion and remove it
			const start = pos.start.offset;
			const end = pos.end.offset;

			// Check if it's the only thing on the line (with optional whitespace)
			const lineStart = content.lastIndexOf("\n", start) + 1;
			const lineEnd = content.indexOf("\n", end);
			const before = content.substring(lineStart, start);
			const after = content.substring(end, lineEnd === -1 ? content.length : lineEnd);

			if (before.trim() === "" && after.trim() === "") {
				// Remove the whole line
				return (
					content.substring(0, lineStart) +
					content.substring(lineEnd === -1 ? content.length : lineEnd + 1)
				);
			}

			return content.substring(0, start) + content.substring(end);
		});
	}
}
