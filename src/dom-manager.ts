import { MarkdownRenderChild, RGB } from 'obsidian';

import PDFReader from 'main';
import { ColorPalette } from 'color-palette';
import { DEFAULT_BACKLINK_HOVER_COLOR } from 'settings';
import { hexToRgb, isHexString, rgbStringToObject } from 'utils';
import { PDFReaderComponent } from 'lib/component';


export class DomManager extends PDFReaderComponent {
	styleEl: HTMLStyleElement;

	constructor(plugin: PDFReader) {
		super(plugin);
		this.styleEl = plugin.registerEl(createEl('style', { attr: { id: 'pdf-reader-style' } }));
		document.head.append(this.styleEl);
	}

	update() {
		this.unload();
		// reload only if parent is loaded
		this.plugin.removeChild(this);
		this.plugin.addChild(this);
	}

	registerEl<HTMLElementType extends HTMLElement>(el: HTMLElementType) {
		this.register(() => el.remove());
		return el;
	}

	onload() {
		this.plugin.trigger('update-dom');

		this.updateStyleEl();

		this.updateClass('pdf-reader-click-embed-to-open-link', this.settings.dblclickEmbedToOpenLink);
		this.updateClass('pdf-reader-backlink-selection-highlight', this.settings.selectionBacklinkVisualizeStyle === 'highlight');
		this.updateClass('pdf-reader-backlink-selection-underline', this.settings.selectionBacklinkVisualizeStyle === 'underline');

		this.app.workspace.trigger('css-change');
	}

	updateClass(className: string, condition: boolean) {
		document.body.toggleClass(className, condition);
		this.register(() => document.body.removeClass(className));
	}

	updateStyleEl() {
		const settings = this.plugin.settings;

		this.styleEl.textContent = Object.entries(settings.colors).map(([name, color]) => {
			return isHexString(color) ? [
				`.pdf-reader-backlink-highlight-layer .pdf-reader-backlink:not(.hovered-highlight)[data-highlight-color="${name.toLowerCase()}"],`,
				`.pdf-embed[data-highlight-color="${name.toLowerCase()}"] .textLayer .mod-focused {`,
				`    --pdf-reader-color: ${color};`,
				`    --pdf-reader-backlink-icon-color: ${color};`,
				`    --pdf-reader-rect-color: ${color};`,
				`}`
			].join('\n') : '';
		}).join('\n');

		let defaultColor = settings.colors[settings.defaultColor];
		if (!defaultColor || !isHexString(defaultColor)) {
			defaultColor = 'rgb(var(--text-highlight-bg-rgb))';
		}
		this.styleEl.textContent += [
			`\n.pdf-reader-backlink-highlight-layer .pdf-reader-backlink:not(.hovered-highlight) {`,
			`    --pdf-reader-color: ${defaultColor};`,
			`    --pdf-reader-backlink-icon-color: ${defaultColor};`,
			`    --pdf-reader-rect-color: ${defaultColor};`,
			`}`
		].join('\n');

		let backlinkHoverColor = settings.colors[settings.backlinkHoverColor];
		if (!backlinkHoverColor || !isHexString(backlinkHoverColor)) backlinkHoverColor = DEFAULT_BACKLINK_HOVER_COLOR;
		this.styleEl.textContent += [
			`\n.pdf-reader-backlink-highlight-layer .pdf-reader-backlink.hovered-highlight {`,
			`	--pdf-reader-color: ${backlinkHoverColor};`,
			`	--pdf-reader-backlink-icon-color: ${backlinkHoverColor};`,
			`   --pdf-reader-rect-color: ${backlinkHoverColor};`,
			`}`
		].join('\n');

		for (const [name, color] of Object.entries(settings.colors)) {
			if (!isHexString(color)) continue;

			this.styleEl.textContent += [
				`\n.${ColorPalette.CLS}-item[data-highlight-color="${name.toLowerCase()}"] > .${ColorPalette.CLS}-item-inner {`,
				`    background-color: ${color};`,
				`}`
			].join('\n');
		}

		this.styleEl.textContent += [
			`\n.${ColorPalette.CLS}-item:not([data-highlight-color]) > .${ColorPalette.CLS}-item-inner {`,
			`    background-color: transparent;`,
			`}`
		].join('\n');

		this.styleEl.textContent += [
			`\n.workspace-leaf.pdf-reader-link-opened.is-highlighted::before {`,
			`	opacity: ${settings.existingTabHighlightOpacity};`,
			`}`,
			`\n.pdf-reader-backlink-highlight-layer {`,
			`    position: absolute;`,
			`    top: 0;`,
			`    left: 0;`,
			`    z-index: 10;`,
			`    pointer-events: none;`,
			`}`,
			`\n.pdf-reader-backlink-highlight-layer .pdf-reader-backlink {`,
			`    background-color: rgb(from var(--pdf-reader-color) r g b / var(--pdf-reader-highlight-opacity, 0.2));`,
			`}`,
			`\n.pdf-reader-backlink-highlight-layer .pdf-reader-backlink.hovered-highlight {`,
			`    background-color: var(--pdf-reader-color);`,
			`    opacity: 1;`,
			`}`,
			`\n.pdf-reader-virtual-annotation {`,
			`    background-color: var(--pdf-reader-color, rgba(255, 128, 0, 0.4));`,
			`    opacity: 0.6;`,
			`    pointer-events: none;`,
			`    position: absolute;`,
			`    z-index: 11;`,
			`}`
		].join('\n');

		this.setCSSColorVariables();
		this.updateCalloutStyle();
	}

	updateCalloutStyle() {
		if (!this.plugin.settings.useCallout) return;

		const calloutType = this.plugin.settings.calloutType.toLowerCase();

		for (const colorName of Object.keys(this.plugin.settings.colors)) {
			const varName = this.toCSSVariableName(colorName) ?? '--pdf-reader-default-color-rgb';

			this.styleEl.textContent += [
				`\n.callout[data-callout="${calloutType}"][data-callout-metadata="${colorName.toLowerCase()}"] {`,
				`	--callout-color: var(${varName});`,
				`   background-color: rgba(var(--callout-color), var(--pdf-reader-highlight-opacity, 0.2))`,
				`}`
			].join('\n');
		}

		this.styleEl.textContent += [
			`\n.callout[data-callout="${calloutType}"] {`,
			`	--callout-color: var(--pdf-reader-default-color-rgb);`,
			`   background-color: rgba(var(--callout-color), var(--pdf-reader-highlight-opacity, 0.2))`,
			`}`
		].join('\n');

		const iconName = this.plugin.settings.calloutIcon;
		if (iconName) {
			this.styleEl.textContent += [
				`\n.callout[data-callout="${calloutType}"] {`,
				`   --callout-icon: lucide-${iconName};`,
				`}`
			].join('\n');
		} else {
			this.styleEl.textContent += [
				`\n.callout[data-callout="${calloutType}"] .callout-icon {`,
				`   display: none;`,
				`}`
			].join('\n');
		}
	}

	registerCalloutRenderer() {
		const calloutType = this.plugin.settings.calloutType.toLowerCase();

		this.plugin.registerMarkdownPostProcessor((el, ctx) => {
			for (const calloutEl of el.querySelectorAll<HTMLElement>(`.callout[data-callout="${calloutType}"][data-callout-metadata*=","]`)) {
				ctx.addChild(new PDFReaderCalloutRenderer(calloutEl));
			}
		});
	}

	setCSSColorVariables() {
		const settings = this.plugin.settings;

		for (const [colorName, hexColor] of Object.entries(settings.colors)) {
			const varName = this.toCSSVariableName(colorName);
			const rgbColor = hexToRgb(hexColor);
			if (varName !== null) {
				if (rgbColor !== null) {
					const { r, g, b } = rgbColor;
					this.styleEl.textContent += [
						`\nbody {`,
						`    ${varName}: ${r}, ${g}, ${b}`,
						`}`
					].join('\n');
				}
			}
		}

		let defaultColorSet = false;
		if (settings.defaultColor in settings.colors) {
			const varName = this.toCSSVariableName(settings.defaultColor);
			if (varName !== null) {
				this.styleEl.textContent += [
					`\nbody {`,
					`    --pdf-reader-default-color-rgb: var(${varName})`,
					`}`
				].join('\n');
				defaultColorSet = true;
			}
		}
		if (!defaultColorSet) {
			this.styleEl.textContent += [
				`\nbody {`,
				`    --pdf-reader-default-color-rgb: var(--text-highlight-bg-rgb)`,
				`}`
			].join('\n');
		}

		// let defaultColor = settings.colors[settings.defaultColor];
		// if (!defaultColor || !isHexString(defaultColor)) {
		// 	defaultColor = 'rgb(var(--text-highlight-bg-rgb))';
		// }
		// this.styleEl.textContent += [
		// 	`\n.pdf-reader-backlink-highlight-layer .pdf-reader-backlink:not(.hovered-highlight) {`,
		// 	`    background-color: ${defaultColor};`,
		// 	`}`
		// ].join('\n');
	}

	toCSSVariableName(colorName: string): string | null {
		// extract alphanumeric parts from colorName, and then concatenate them with '-'
		let encoded = colorName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
		// strip leading and trailing '-'
		encoded = encoded.replace(/^-+|-+$/g, '');
		return encoded ? '--pdf-reader-' + encoded + '-rgb' : null;
	}

	getRgb(colorName?: string): RGB {
		// Fallback to settings directly if CSS variables aren't ready
		if (colorName && colorName in this.settings.colors) {
			const hex = this.settings.colors[colorName];
			const rgb = hexToRgb(hex);
			if (rgb) return rgb;
		}

		let colorVarName = '--pdf-reader-default-color-rgb';
		if (colorName) {
			const specificColorVarName = this.toCSSVariableName(colorName);
			if (specificColorVarName) {
				colorVarName = specificColorVarName;
			}
		}
		const rgbString = getComputedStyle(document.body).getPropertyValue(colorVarName); // "R, G, B"
		const rgbColor = rgbStringToObject(rgbString);
		if (isNaN(rgbColor.r)) {
			// Absolute fallback
			return hexToRgb(this.settings.colors[this.settings.defaultColor]) ?? { r: 255, g: 208, b: 0 };
		}
		return rgbColor;
	}
}

class PDFReaderCalloutRenderer extends MarkdownRenderChild {
	onload() {
		const metadata = this.containerEl.dataset.calloutMetadata;
		if (metadata) {
			const rgb = metadata.split(',').map((val) => parseInt(val));
			const isRgb = rgb.length === 3 && rgb.every((val) => 0 <= val && val <= 255);

			if (isRgb) {
				this.containerEl.style.setProperty('--callout-color', rgb.join(', '));
			}
		}
	}
}
