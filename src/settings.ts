import { Component, DropdownComponent, Events, HexString, IconName, MarkdownRenderer, Modifier, Notice, ObsidianProtocolData, Platform, PluginSettingTab, Setting, TextAreaComponent, TextComponent, debounce, setIcon, setTooltip } from 'obsidian';

import PDFReader from 'main';
import { ExtendedPaneType } from 'lib/workspace-lib';
import { AutoFocusTarget } from 'lib/copy-link';
import { CommandSuggest, FuzzyFileSuggest, FuzzyFolderSuggest, FuzzyMarkdownFileSuggest, KeysOfType, getModifierDictInPlatform, getModifierNameInPlatform, isHexString } from 'utils';
import { InstallerVersionModal } from 'modals';
import { ScrollMode, SidebarView, SpreadMode } from 'pdfjs-enums';
import { Menu } from 'obsidian';
import { PDFExternalLinkPostProcessor, PDFInternalLinkPostProcessor, PDFOutlineItemPostProcessor, PDFThumbnailItemPostProcessor } from 'post-process';
import { BibliographyManager } from 'bib';


const SELECTION_BACKLINK_VISUALIZE_STYLE = {
	'highlight': 'Highlight',
	'underline': 'Underline',
} as const;
export type SelectionBacklinkVisualizeStyle = keyof typeof SELECTION_BACKLINK_VISUALIZE_STYLE;

const HOVER_HIGHLIGHT_ACTIONS = {
	'open': 'Open backlink',
	'preview': 'Popover preview of backlink',
} as const;

const PANE_TYPE: Record<ExtendedPaneType, string> = {
	'': 'Current tab',
	'tab': 'New tab',
	'right': 'Split right',
	'left': 'Split left',
	'down': 'Split down',
	'up': 'Split up',
	'window': 'New window',
	'right-sidebar': 'Right sidebar',
	'left-sidebar': 'Left sidebar'
};

const AUTO_FOCUS_TARGETS: Record<AutoFocusTarget, string> = {
	'last-paste': 'Last-pasted note',
	'last-active': 'Last-active markdown file',
	'last-active-and-open': 'Last-active markdown file (only if it is still opened)',
	'last-paste-then-last-active': 'Last-pasted note (if none, then last-active markdown file)',
	'last-paste-then-last-active-and-open': 'Last-pasted note (if none, then last-active markdown file, only if it is still opened)',
	'last-active-and-open-then-last-paste': 'Last-active markdown file (only if it is still opened; if none, then last-pasted note)',
	'associated-note': 'Associated note',
};

const NEW_FILE_LOCATIONS = {
	'root': 'Vault folder',
	'current': 'Same folder as current file',
	'folder': 'In the folder specified below',
} as const;
type NewFileLocation = keyof typeof NEW_FILE_LOCATIONS;

const NEW_ATTACHMENT_LOCATIONS = {
	'root': 'Vault folder',
	'current': 'Same folder as current file',
	'folder': 'In the folder specified below',
	'subfolder': 'In subfolder under current folder',
	'obsidian': 'Same as Obsidian\'s attachment location',
} as const;
type NewAttachmentLocation = keyof typeof NEW_ATTACHMENT_LOCATIONS;

const IMAGE_EXTENSIONS = [
	'png',
	'jpg',
	'webp',
	'bmp',
] as const;
export type ImageExtension = typeof IMAGE_EXTENSIONS[number];

export interface NamedTemplate {
	name: string;
	template: string;
}

export const DEFAULT_BACKLINK_HOVER_COLOR = 'green';

const ACTION_ON_CITATION_HOVER = {
	'none': 'Same as other internal links',
	'pdf-reader-bib-popover': 'PDF Reader\'s custom bibliography popover',
	'google-scholar-popover': 'Google Scholar popover',
} as const;

const MOBILE_COPY_ACTIONS = {
	'text': 'Copy text',
	'obsidian': 'Obsidian default (copy as quote)',
	'pdf-reader': 'Run PDF Reader\'s copy command',
} as const;

export interface PDFReaderSettings {
	displayTextFormats: NamedTemplate[];
	defaultDisplayTextFormatIndex: number,
	syncDisplayTextFormat: boolean;
	syncDefaultDisplayTextFormat: boolean;
	copyCommands: NamedTemplate[];
	useAnotherCopyTemplateWhenNoSelection: boolean;
	copyTemplateWhenNoSelection: string;
	trimSelectionEmbed: boolean;
	embedMargin: number;
	noSidebarInEmbed: boolean;
	noSpreadModeInEmbed: boolean;
	embedUnscrollable: boolean;
	singleTabForSinglePDF: boolean;
	highlightExistingTab: boolean;
	existingTabHighlightOpacity: number;
	existingTabHighlightDuration: number;
	paneTypeForFirstPDFLeaf: ExtendedPaneType;
	openLinkNextToExistingPDFTab: boolean;
	openPDFWithDefaultApp: boolean;
	openPDFWithDefaultAppAndObsidian: boolean;
	focusObsidianAfterOpenPDFWithDefaultApp: boolean;
	syncWithDefaultApp: boolean;
	dontActivateAfterOpenPDF: boolean;
	dontActivateAfterOpenMD: boolean;
	highlightDuration: number;
	noTextHighlightsInEmbed: boolean;
	noAnnotationHighlightsInEmbed: boolean;
	persistentTextHighlightsInEmbed: boolean;
	persistentAnnotationHighlightsInEmbed: boolean;
	highlightBacklinks: boolean;
	selectionBacklinkVisualizeStyle: SelectionBacklinkVisualizeStyle;
	dblclickEmbedToOpenLink: boolean;
	highlightBacklinksPane: boolean;
	highlightOnHoverBacklinkPane: boolean;
	backlinkHoverColor: HexString;
	colors: Record<string, HexString>;
	defaultColor: string;
	defaultColorPaletteItemIndex: number;
	syncColorPaletteItem: boolean;
	syncDefaultColorPaletteItem: boolean;
	colorPaletteInToolbar: boolean;
	noColorButtonInColorPalette: boolean;
	colorPaletteInEmbedToolbar: boolean;
	quietColorPaletteTooltip: boolean;
	showStatusInToolbar: boolean;
	highlightColorSpecifiedOnly: boolean;
	doubleClickHighlightToOpenBacklink: boolean;
	hoverHighlightAction: keyof typeof HOVER_HIGHLIGHT_ACTIONS;
	paneTypeForFirstMDLeaf: ExtendedPaneType;
	singleMDLeafInSidebar: boolean;
	alwaysUseSidebar: boolean;
	ignoreExistingMarkdownTabIn: ('leftSplit' | 'rightSplit' | 'floatingSplit')[];
	defaultColorPaletteActionIndex: number,
	syncColorPaletteAction: boolean;
	syncDefaultColorPaletteAction: boolean;
	proxyMDProperty: string;
	hoverPDFLinkToOpen: boolean;
	ignoreHeightParamInPopoverPreview: boolean;
	filterBacklinksByPageDefault: boolean;
	showBacklinkToPage: boolean;
	enableHoverPDFInternalLink: boolean;
	recordPDFInternalLinkHistory: boolean;
	alwaysRecordHistory: boolean;
	renderMarkdownInStickyNote: boolean;
	enablePDFEdit: boolean;
	author: string;
	writeHighlightToFileOpacity: number;

	defaultWriteFileToggle: boolean;
	syncWriteFileToggle: boolean;
	syncDefaultWriteFileToggle: boolean;
	enableAnnotationContentEdit: boolean;
	warnEveryAnnotationDelete: boolean;
	warnBacklinkedAnnotationDelete: boolean;
	enableAnnotationDeletion: boolean;
	enableEditEncryptedPDF: boolean;
	pdfLinkColor: HexString;
	pdfLinkBorder: boolean;
	replaceContextMenu: boolean;
	showContextMenuOnMouseUpIf: 'always' | 'never' | Modifier;
	contextMenuConfig: { id: string, visible: boolean }[];
	selectionProductMenuConfig: ('color' | 'copy-format' | 'display')[];
	writeFileProductMenuConfig: ('color' | 'copy-format' | 'display')[];
	annotationProductMenuConfig: ('copy-format' | 'display')[];
	updateColorPaletteStateFromContextMenu: boolean;
	showContextMenuOnTablet: boolean;
	mobileCopyAction: keyof typeof MOBILE_COPY_ACTIONS;
	executeBuiltinCommandForOutline: boolean;
	executeBuiltinCommandForZoom: boolean;
	executeFontSizeAdjusterCommand: boolean;
	closeSidebarWithShowCommandIfExist: boolean;
	autoHidePDFSidebar: boolean;
	defaultSidebarView: SidebarView;
	outlineDrag: boolean;
	outlineContextMenu: boolean;
	outlineLinkDisplayTextFormat: string;
	outlineLinkCopyFormat: string;
	recordHistoryOnOutlineClick: boolean;
	popoverPreviewOnOutlineHover: boolean;
	thumbnailDrag: boolean;
	thumbnailContextMenu: boolean;
	thumbnailLinkDisplayTextFormat: string;
	thumbnailLinkCopyFormat: string;
	recordHistoryOnThumbnailClick: boolean;
	popoverPreviewOnThumbnailHover: boolean;
	annotationPopupDrag: boolean;
	showAnnotationPopupOnHover: boolean;
	useCallout: boolean;
	calloutType: string;
	calloutIcon: string;
	// canvasContextMenu: boolean;
	highlightBacklinksInEmbed: boolean;
	highlightBacklinksInHoverPopover: boolean;
	highlightBacklinksInCanvas: boolean;
	clickPDFInternalLinkWithModifierKey: boolean;
	clickOutlineItemWithModifierKey: boolean;
	clickThumbnailWithModifierKey: boolean;
	focusEditorAfterAutoPaste: boolean;
	clearSelectionAfterAutoPaste: boolean;
	respectCursorPositionWhenAutoPaste: boolean;
	blankLineAboveAppendedContent: boolean;
	autoCopy: boolean;
	autoFocus: boolean;
	autoPaste: boolean;
	autoFocusTarget: AutoFocusTarget;
	autoPasteTarget: AutoFocusTarget;
	openAutoFocusTargetIfNotOpened: boolean;
	howToOpenAutoFocusTargetIfNotOpened: ExtendedPaneType | 'hover-editor';
	closeHoverEditorWhenLostFocus: boolean;
	closeSidebarWhenLostFocus: boolean;
	openAutoFocusTargetInEditingView: boolean;
	executeCommandWhenTargetNotIdentified: boolean;
	commandToExecuteWhenTargetNotIdentified: string;
	autoPasteTargetDialogTimeoutSec: number;
	autoCopyToggleRibbonIcon: boolean;
	autoCopyIconName: string;
	autoFocusToggleRibbonIcon: boolean;
	autoFocusIconName: string;
	autoPasteToggleRibbonIcon: boolean;
	autoPasteIconName: string;
	viewSyncFollowPageNumber: boolean;
	viewSyncPageDebounceInterval: number;
	openAfterExtractPages: boolean;
	howToOpenExtractedPDF: ExtendedPaneType;
	warnEveryPageDelete: boolean;
	warnBacklinkedPageDelete: boolean;
	copyOutlineAsListFormat: string;
	copyOutlineAsListDisplayTextFormat: string;
	copyOutlineAsHeadingsFormat: string;
	copyOutlineAsHeadingsDisplayTextFormat: string;
	copyOutlineAsHeadingsMinLevel: number;
	newFileNameFormat: string;
	newFileTemplatePath: string;
	newPDFLocation: NewFileLocation;
	newPDFFolderPath: string;
	rectEmbedStaticImage: boolean;
	rectImageFormat: 'file' | 'data-url';
	rectImageExtension: ImageExtension;
	rectEmbedResolution: number;
	zoomToFitRect: boolean;
	rectFollowAdaptToTheme: boolean;
	includeColorWhenCopyingRectLink: boolean;
	backlinkIconSize: number;
	showBacklinkIconForSelection: boolean;
	showBacklinkIconForAnnotation: boolean;
	showBacklinkIconForOffset: boolean;
	showBacklinkIconForRect: boolean;
	showBoundingRectForBacklinkedAnnot: boolean;
	hideReplyAnnotation: boolean;
	hideStampAnnotation: boolean;
	searchLinkHighlightAll: 'true' | 'false' | 'default';
	searchLinkCaseSensitive: 'true' | 'false' | 'default';
	searchLinkMatchDiacritics: 'true' | 'false' | 'default';
	searchLinkEntireWord: 'true' | 'false' | 'default';
	dontFitWidthWhenOpenPDFLink: boolean;
	preserveCurrentLeftOffsetWhenOpenPDFLink: boolean;
	defaultZoomValue: string; // 'page-width' | 'page-height' | 'page-fit' | '<PERCENTAGE>'
	scrollModeOnLoad: ScrollMode;
	spreadModeOnLoad: SpreadMode;
	usePageUpAndPageDown: boolean;
	hoverableDropdownMenuInToolbar: boolean;
	zoomLevelInputBoxInToolbar: boolean;
	popoverPreviewOnExternalLinkHover: boolean;
	actionOnCitationHover: keyof typeof ACTION_ON_CITATION_HOVER;
	anystylePath: string;
	enableBibInEmbed: boolean;
	enableBibInHoverPopover: boolean;
	enableBibInCanvas: boolean;
	citationIdPatterns: string;
	copyAsSingleLine: boolean;
	removeWhitespaceBetweenCJChars: boolean;
	// Follows the same format as Obsidian's "Default location for new attachments
	// (`attachmentFolderPath`)" option, except for an empty string meaning 
	// following the Obsidian default
	dummyFileFolderPath: string;
	externalURIPatterns: string[];
	modifierToDropExternalPDFToCreateDummy: Modifier[];
	vim: boolean;
	vimrcPath: string;
	vimVisualMotion: boolean;
	vimScrollSize: number;
	vimLargerScrollSizeWhenZoomIn: boolean;
	vimContinuousScrollSpeed: number;
	vimSmoothScroll: boolean;
	vimHlsearch: boolean;
	vimIncsearch: boolean;
	enableVimInContextMenu: boolean;
	enableVimOutlineMode: boolean;
	vimSmoothOutlineMode: boolean;
	vimHintChars: string;
	vimHintArgs: string;
	PATH: string;
	autoCheckForUpdates: boolean;
	autoSync: boolean;
	fixObsidianTextSelectionBug: boolean;
	selectionToolbar: boolean;
	showSelectionToolbarOnMouseUp: boolean;
}

export const DEFAULT_SETTINGS: PDFReaderSettings = {
	displayTextFormats: [
		// {
		// 	name: 'Obsidian default',
		// 	template: '{{file.basename}}, page {{page}}',
		// },
		{
			name: 'Title & page',
			template: '{{file.basename}}, p.{{pageLabel}}',
		},
		{
			name: 'Page',
			template: 'p.{{pageLabel}}',
		},
		{
			name: 'Text',
			template: '{{text}}',
		},
		{
			name: 'Emoji',
			template: '📖'
		},
		{
			name: 'None',
			template: ''
		}
	],
	defaultDisplayTextFormatIndex: 0,
	syncDisplayTextFormat: true,
	syncDefaultDisplayTextFormat: false,
	copyCommands: [
		{
			name: 'Quote',
			template: '> ({{linkWithDisplay}})\n> {{text}}\n',
		},
		{
			name: 'Link',
			template: '{{linkWithDisplay}}'
		},
		{
			name: 'Embed',
			template: '!{{link}}',
		},
		{
			name: 'Callout',
			template: '> [!{{calloutType}}|{{color}}] {{linkWithDisplay}}\n> {{text}}\n',
		},
		{
			name: 'Quote in callout',
			template: '> [!{{calloutType}}|{{color}}] {{linkWithDisplay}}\n> > {{text}}\n> \n> ',
		}
	],
	useAnotherCopyTemplateWhenNoSelection: false,
	copyTemplateWhenNoSelection: '{{linkToPageWithDisplay}}',
	trimSelectionEmbed: false,
	embedMargin: 50,
	noSidebarInEmbed: true,
	noSpreadModeInEmbed: true,
	embedUnscrollable: false,
	singleTabForSinglePDF: true,
	highlightExistingTab: false,
	existingTabHighlightOpacity: 0.5,
	existingTabHighlightDuration: 0.75,
	paneTypeForFirstPDFLeaf: 'left',
	openLinkNextToExistingPDFTab: true,
	openPDFWithDefaultApp: false,
	openPDFWithDefaultAppAndObsidian: true,
	focusObsidianAfterOpenPDFWithDefaultApp: true,
	syncWithDefaultApp: false,
	dontActivateAfterOpenPDF: true,
	dontActivateAfterOpenMD: true,
	highlightDuration: 0.75,
	noTextHighlightsInEmbed: false,
	noAnnotationHighlightsInEmbed: true,
	persistentTextHighlightsInEmbed: true,
	persistentAnnotationHighlightsInEmbed: false,
	highlightBacklinks: true,
	selectionBacklinkVisualizeStyle: 'highlight',
	dblclickEmbedToOpenLink: true,
	highlightBacklinksPane: true,
	highlightOnHoverBacklinkPane: true,
	backlinkHoverColor: '',
	colors: {
		'Yellow': '#ffd000',
		'Red': '#ea5252',
		'Note': '#086ddd',
		'Important': '#bb61e5',
	},
	defaultColor: '',
	defaultColorPaletteItemIndex: -1,
	syncColorPaletteItem: true,
	syncDefaultColorPaletteItem: false,
	colorPaletteInToolbar: true,
	noColorButtonInColorPalette: true,
	colorPaletteInEmbedToolbar: false,
	quietColorPaletteTooltip: false,
	showStatusInToolbar: true,
	highlightColorSpecifiedOnly: false,
	doubleClickHighlightToOpenBacklink: true,
	hoverHighlightAction: 'preview',
	paneTypeForFirstMDLeaf: 'right',
	singleMDLeafInSidebar: true,
	alwaysUseSidebar: true,
	ignoreExistingMarkdownTabIn: [],
	defaultColorPaletteActionIndex: 4,
	syncColorPaletteAction: true,
	syncDefaultColorPaletteAction: false,
	proxyMDProperty: 'PDF',
	hoverPDFLinkToOpen: false,
	ignoreHeightParamInPopoverPreview: true,
	filterBacklinksByPageDefault: true,
	showBacklinkToPage: true,
	enableHoverPDFInternalLink: true,
	recordPDFInternalLinkHistory: true,
	alwaysRecordHistory: true,
	renderMarkdownInStickyNote: false,
	enablePDFEdit: false,
	author: '',
	writeHighlightToFileOpacity: 0.2,
	defaultWriteFileToggle: false,
	syncWriteFileToggle: true,
	syncDefaultWriteFileToggle: false,
	enableAnnotationDeletion: true,
	warnEveryAnnotationDelete: false,
	warnBacklinkedAnnotationDelete: true,
	enableAnnotationContentEdit: true,
	enableEditEncryptedPDF: false,
	pdfLinkColor: '#04a802',
	pdfLinkBorder: false,
	replaceContextMenu: false,
	showContextMenuOnMouseUpIf: 'never',
	contextMenuConfig: [
		{ id: 'action', visible: true },
		{ id: 'write-file', visible: true },
		{ id: 'selection', visible: true },
		{ id: 'annotation', visible: true },
		{ id: 'modify-annotation', visible: true },
		{ id: 'link', visible: true },
		{ id: 'text', visible: true },
		{ id: 'search', visible: true },
		{ id: 'speech', visible: true },
		{ id: 'page', visible: true },
		{ id: 'settings', visible: true },
	],
	selectionProductMenuConfig: ['color', 'copy-format', 'display'],
	writeFileProductMenuConfig: ['color', 'copy-format', 'display'],
	annotationProductMenuConfig: ['copy-format', 'display'],
	updateColorPaletteStateFromContextMenu: true,
	mobileCopyAction: 'pdf-reader',
	showContextMenuOnTablet: false,
	executeBuiltinCommandForOutline: true,
	executeBuiltinCommandForZoom: true,
	executeFontSizeAdjusterCommand: true,
	closeSidebarWithShowCommandIfExist: true,
	autoHidePDFSidebar: false,
	defaultSidebarView: SidebarView.THUMBS,
	outlineDrag: true,
	outlineContextMenu: true,
	outlineLinkDisplayTextFormat: '{{file.basename}}, {{text}}',
	outlineLinkCopyFormat: '{{linkWithDisplay}}',
	recordHistoryOnOutlineClick: true,
	popoverPreviewOnOutlineHover: true,
	thumbnailDrag: true,
	thumbnailContextMenu: true,
	thumbnailLinkDisplayTextFormat: '{{file.basename}}, p.{{pageLabel}}',
	thumbnailLinkCopyFormat: '{{linkWithDisplay}}',
	recordHistoryOnThumbnailClick: true,
	popoverPreviewOnThumbnailHover: true,
	annotationPopupDrag: true,
	showAnnotationPopupOnHover: true,
	useCallout: true,
	calloutType: 'PDF',
	calloutIcon: 'highlighter',
	// canvasContextMenu: true
	highlightBacklinksInEmbed: false,
	highlightBacklinksInHoverPopover: false,
	highlightBacklinksInCanvas: true,
	clickPDFInternalLinkWithModifierKey: true,
	clickOutlineItemWithModifierKey: true,
	clickThumbnailWithModifierKey: true,
	focusEditorAfterAutoPaste: true,
	clearSelectionAfterAutoPaste: true,
	respectCursorPositionWhenAutoPaste: true,
	blankLineAboveAppendedContent: true,
	autoCopy: false,
	autoFocus: false,
	autoPaste: false,
	autoFocusTarget: 'last-active-and-open-then-last-paste',
	autoPasteTarget: 'last-active-and-open-then-last-paste',
	openAutoFocusTargetIfNotOpened: true,
	howToOpenAutoFocusTargetIfNotOpened: 'right',
	closeHoverEditorWhenLostFocus: true,
	closeSidebarWhenLostFocus: false,
	openAutoFocusTargetInEditingView: true,
	executeCommandWhenTargetNotIdentified: true,
	commandToExecuteWhenTargetNotIdentified: 'switcher:open',
	autoPasteTargetDialogTimeoutSec: 20,
	autoCopyToggleRibbonIcon: true,
	autoCopyIconName: 'highlighter',
	autoFocusToggleRibbonIcon: true,
	autoFocusIconName: 'zap',
	autoPasteToggleRibbonIcon: true,
	autoPasteIconName: 'clipboard-paste',
	viewSyncFollowPageNumber: true,
	viewSyncPageDebounceInterval: 0.3,
	openAfterExtractPages: true,
	howToOpenExtractedPDF: 'tab',
	warnEveryPageDelete: false,
	warnBacklinkedPageDelete: true,
	copyOutlineAsListFormat: '{{linkWithDisplay}}',
	copyOutlineAsListDisplayTextFormat: '{{text}}',
	copyOutlineAsHeadingsFormat: '{{text}}\n\n{{linkWithDisplay}}',
	copyOutlineAsHeadingsDisplayTextFormat: 'p.{{pageLabel}}',
	copyOutlineAsHeadingsMinLevel: 2,
	newFileNameFormat: '',
	newFileTemplatePath: '',
	newPDFLocation: 'current',
	newPDFFolderPath: '',
	rectEmbedStaticImage: false,
	rectImageFormat: 'file',
	rectImageExtension: 'webp',
	zoomToFitRect: false,
	rectFollowAdaptToTheme: true,
	rectEmbedResolution: 100,
	includeColorWhenCopyingRectLink: true,
	backlinkIconSize: 50,
	showBacklinkIconForSelection: false,
	showBacklinkIconForAnnotation: false,
	showBacklinkIconForOffset: true,
	showBacklinkIconForRect: false,
	showBoundingRectForBacklinkedAnnot: false,
	hideReplyAnnotation: false,
	hideStampAnnotation: false,
	searchLinkHighlightAll: 'true',
	searchLinkCaseSensitive: 'true',
	searchLinkMatchDiacritics: 'default',
	searchLinkEntireWord: 'false',
	dontFitWidthWhenOpenPDFLink: true,
	preserveCurrentLeftOffsetWhenOpenPDFLink: false,
	defaultZoomValue: 'page-width',
	scrollModeOnLoad: ScrollMode.VERTICAL,
	spreadModeOnLoad: SpreadMode.NONE,
	usePageUpAndPageDown: true,
	hoverableDropdownMenuInToolbar: true,
	zoomLevelInputBoxInToolbar: true,
	popoverPreviewOnExternalLinkHover: true,
	actionOnCitationHover: 'pdf-reader-bib-popover',
	anystylePath: '',
	enableBibInEmbed: false,
	enableBibInHoverPopover: false,
	enableBibInCanvas: true,
	citationIdPatterns: '^cite.\n^bib\\d+$',
	copyAsSingleLine: true,
	removeWhitespaceBetweenCJChars: true,
	dummyFileFolderPath: '',
	externalURIPatterns: [
		'.*\\.pdf$',
		'https://arxiv.org/pdf/.*'
	],
	modifierToDropExternalPDFToCreateDummy: ['Shift'],
	vim: false,
	vimrcPath: '',
	vimVisualMotion: true,
	vimScrollSize: 40,
	vimLargerScrollSizeWhenZoomIn: true,
	vimContinuousScrollSpeed: 1.2,
	vimSmoothScroll: true,
	vimHlsearch: true,
	vimIncsearch: true,
	enableVimInContextMenu: true,
	enableVimOutlineMode: true,
	vimSmoothOutlineMode: true,
	vimHintChars: 'hjklasdfgyuiopqwertnmzxcvb',
	vimHintArgs: 'all',
	PATH: '',
	autoCheckForUpdates: true,
	autoSync: false,
	fixObsidianTextSelectionBug: true,
	selectionToolbar: true,
	showSelectionToolbarOnMouseUp: true,
};


export function isPDFReaderSettingsKey(key: string): key is keyof PDFReaderSettings {
	return DEFAULT_SETTINGS.hasOwnProperty(key);
}


const modKey = getModifierNameInPlatform('Mod').toLowerCase();


export class PDFReaderSettingTab extends PluginSettingTab {
	component: Component;
	items: Partial<Record<keyof PDFReaderSettings, Setting>>;
	headings: Map<string, Setting>;
	promises: Promise<any>[];

	contentEl: HTMLElement;

	events = new Events();

	constructor(public plugin: PDFReader) {
		super(plugin.app, plugin);
		this.component = new Component();
		this.items = {};
		this.headings = new Map();
		this.promises = [];

		this.containerEl.addClass('pdf-reader-settings');
		this.contentEl = this.containerEl.createDiv('content');
	}

	addSetting(settingName?: keyof PDFReaderSettings) {
		const item = new Setting(this.contentEl);
		if (settingName) {
			this.items[settingName] = item;
			this.component.registerDomEvent(item.settingEl, 'contextmenu', (evt) => {
				evt.preventDefault();
				new Menu()
					.addItem((item) => {
						item.setTitle('Restore default value of this setting')
							.setIcon('lucide-undo-2')
							.onClick(async () => {
								// @ts-ignore
								this.plugin.settings[settingName] = this.plugin.getDefaultSettings()[settingName];
								await this.plugin.saveSettings();

								this.redisplay();

								new Notice(`${this.plugin.manifest.name}: Default setting restored. Note that some options require a restart to take effect.`, 6000);
							});
					})
					.addItem((item) => {
						item.setTitle('Copy link to this setting')
							.setIcon('lucide-link')
							.onClick(() => {
								navigator.clipboard.writeText(`obsidian://pdf-reader?setting=${settingName}`);
							});
					})
					.showAtMouseEvent(evt);
			});
		}
		return item;
	}

	addHeading(heading: string, id: string) {
		const setting = this.addSetting()
			.setName(heading)
			.setHeading();

		this.headings.set(id, setting);
		this.component.registerDomEvent(setting.settingEl, 'contextmenu', (evt) => {
			evt.preventDefault();
			new Menu()
				.addItem((item) => {
					item.setTitle('Copy link to this heading')
						.setIcon('lucide-link')
						.onClick(() => {
							navigator.clipboard.writeText(`obsidian://pdf-reader?setting=heading:${id}`);
						});
				})
				.showAtMouseEvent(evt);
		});

		return setting;
	}



	scrollTo(settingName: keyof PDFReaderSettings, options?: { behavior: ScrollBehavior }) {
		const setting = this.items[settingName];
		if (setting) this.scrollToSetting(setting, options);
	}

	scrollToHeading(id: string, options?: { behavior: ScrollBehavior }) {
		const setting = this.headings.get(id);
		if (setting) this.scrollToSetting(setting, options);
	}

	scrollToSetting(setting: Setting, options?: { behavior: ScrollBehavior }) {
		const el = setting.settingEl;
		if (el) this.containerEl.scrollTo({ top: el.offsetTop, ...options });
	}

	openFromObsidianUrl(params: ObsidianProtocolData) {
		const id = params.setting;
		if (id.startsWith('heading:')) {
			this.plugin.openSettingTab()
				.scrollToHeading(id.slice('heading:'.length));
		} else if (isPDFReaderSettingsKey(id)) {
			this.plugin.openSettingTab()
				.scrollTo(id);
		}
		return;
	}

	getVisibilityToggler(setting: Setting, condition: () => boolean) {
		const toggleVisibility = () => {
			condition() ? setting.settingEl.show() : setting.settingEl.hide();
		};
		toggleVisibility();
		return toggleVisibility;
	}

	showConditionally(setting: Setting | Setting[], condition: () => boolean) {
		const settings = Array.isArray(setting) ? setting : [setting];
		const togglers = settings.map((setting) => this.getVisibilityToggler(setting, condition));
		this.events.on('update', () => togglers.forEach((toggler) => toggler()));
		return settings;
	}

	addTextSetting(settingName: KeysOfType<PDFReaderSettings, string>, placeholder?: string, onBlurOrEnter?: (setting: Setting) => any) {
		const setting = this.addSetting(settingName)
			.addText((text) => {
				text.setValue(this.plugin.settings[settingName])
					.setPlaceholder(placeholder ?? '')
					.then((text) => {
						if (placeholder) {
							text.inputEl.size = Math.max(text.inputEl.size, text.inputEl.placeholder.length);
						}
					})
					.onChange(async (value) => {
						// @ts-ignore
						this.plugin.settings[settingName] = value;
						await this.plugin.saveSettings();
					});
				if (onBlurOrEnter) {
					this.component.registerDomEvent(text.inputEl, 'blur', () => {
						onBlurOrEnter(setting);
					});
					this.component.registerDomEvent(text.inputEl, 'keypress', (evt) => {
						if (evt.key === 'Enter') onBlurOrEnter(setting);
					});
				}
			});
		return setting;
	}

	addTextAreaSetting(settingName: KeysOfType<PDFReaderSettings, string>, placeholder?: string, onBlur?: () => any) {
		return this.addSetting(settingName)
			.addTextArea((text) => {
				text.setValue(this.plugin.settings[settingName])
					.setPlaceholder(placeholder ?? '')
					.onChange(async (value) => {
						// @ts-ignore
						this.plugin.settings[settingName] = value;
						await this.plugin.saveSettings();
					});
				if (onBlur) this.component.registerDomEvent(text.inputEl, 'blur', onBlur);
			});
	}

	addNumberSetting(settingName: KeysOfType<PDFReaderSettings, number>) {
		return this.addSetting(settingName)
			.addText((text) => {
				text.setValue('' + this.plugin.settings[settingName])
					.setPlaceholder('' + DEFAULT_SETTINGS[settingName])
					.then((text) => text.inputEl.type = 'number')
					.onChange(async (value) => {
						// @ts-ignore
						this.plugin.settings[settingName] = value === '' ? DEFAULT_SETTINGS[settingName] : +value;
						await this.plugin.saveSettings();
					});
			});
	}

	addToggleSetting(settingName: KeysOfType<PDFReaderSettings, boolean>, extraOnChange?: (value: boolean) => void) {
		return this.addSetting(settingName)
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings[settingName])
					.onChange(async (value) => {
						// @ts-ignore
						this.plugin.settings[settingName] = value;
						await this.plugin.saveSettings();
						extraOnChange?.(value);
					});
			});
	}

	addColorPickerSetting(settingName: KeysOfType<PDFReaderSettings, HexString>, extraOnChange?: (value: HexString) => void) {
		return this.addSetting(settingName)
			.addColorPicker((picker) => {
				picker.setValue(this.plugin.settings[settingName])
					.onChange(async (value) => {
						// @ts-ignore
						this.plugin.settings[settingName] = value;
						await this.plugin.saveSettings();
						extraOnChange?.(value);
					});
			});
	}

	addDropdownSetting(settingName: KeysOfType<PDFReaderSettings, string>, options: readonly string[], display?: (option: string) => string, extraOnChange?: (value: string) => void): Setting;
	addDropdownSetting(settingName: KeysOfType<PDFReaderSettings, string>, options: Record<string, string>, extraOnChange?: (value: string) => void): Setting;
	addDropdownSetting(settingName: KeysOfType<PDFReaderSettings, string>, ...args: any[]) {
		let options: string[] = [];
		let display = (optionValue: string) => optionValue;
		let extraOnChange = (value: string) => { };
		if (Array.isArray(args[0])) {
			options = args[0];
			if (typeof args[1] === 'function') display = args[1];
			if (typeof args[2] === 'function') extraOnChange = args[2];
		} else {
			options = Object.keys(args[0]);
			display = (optionValue: string) => args[0][optionValue];
			if (typeof args[1] === 'function') extraOnChange = args[1];
		}
		return this.addSetting(settingName)
			.addDropdown((dropdown) => {
				for (const option of options) {
					const displayName = display(option) ?? option;
					dropdown.addOption(option, displayName);
				}
				dropdown.setValue(this.plugin.settings[settingName])
					.onChange(async (value) => {
						// @ts-ignore
						this.plugin.settings[settingName] = value;
						await this.plugin.saveSettings();
						extraOnChange?.(value);
					});
			});
	}

	addIndexDropdownSetting(settingName: KeysOfType<PDFReaderSettings, number>, options: readonly string[], display?: (option: string) => string, extraOnChange?: (value: number) => void): Setting {
		return this.addSetting(settingName)
			.addDropdown((dropdown) => {
				for (const option of options) {
					const displayName = display?.(option) ?? option;
					dropdown.addOption(option, displayName);
				}
				const index = this.plugin.settings[settingName];
				const option = options[index];
				dropdown.setValue(option)
					.onChange(async (value) => {
						const newIndex = options.indexOf(value);
						if (newIndex !== -1) {
							// @ts-ignore
							this.plugin.settings[settingName] = newIndex;
							await this.plugin.saveSettings();
							extraOnChange?.(newIndex);
						}
					});
			});
	}

	addEnumDropdownSetting(settingName: KeysOfType<PDFReaderSettings, number>, enumObj: Record<string, string>, extraOnChange?: (value: number) => void) {
		return this.addSetting(settingName)
			.addDropdown((dropdown) => {
				for (const [key, value] of Object.entries(enumObj)) {
					if (parseInt(key).toString() === key) {
						dropdown.addOption(key, value);
					}
				}
				dropdown.setValue('' + this.plugin.settings[settingName])
					.onChange(async (value) => {
						// @ts-ignore
						this.plugin.settings[settingName] = +value;
						await this.plugin.saveSettings();
						extraOnChange?.(+value);
					});
			});
	}

	addSliderSetting(settingName: KeysOfType<PDFReaderSettings, number>, min: number, max: number, step: number) {
		return this.addSetting(settingName)
			.addSlider((slider) => {
				slider.setLimits(min, max, step)
					.setValue(this.plugin.settings[settingName])
					.setDynamicTooltip()
					.onChange(async (value) => {
						// @ts-ignore
						this.plugin.settings[settingName] = value;
						await this.plugin.saveSettings();
					});
			});
	}

	addDesc(desc: string) {
		return this.addSetting()
			.setDesc(desc);
	}

	addFileLocationSetting(
		settingName: KeysOfType<PDFReaderSettings, NewFileLocation>,
		postProcessDropdownSetting: (setting: Setting) => any,
		folderPathSettingName: KeysOfType<PDFReaderSettings, string>,
		postProcessFolderPathSetting: (setting: Setting) => any
	) {
		return [
			this.addDropdownSetting(settingName, NEW_FILE_LOCATIONS, () => this.redisplay())
				.then(postProcessDropdownSetting),
			this.addSetting()
				.addText((text) => {
					text.setValue(this.plugin.settings[folderPathSettingName]);
					text.inputEl.size = 30;
					new FuzzyFolderSuggest(this.app, text.inputEl)
						.onSelect(({ item: folder }) => {
							// @ts-ignore
							this.plugin.settings[folderPathSettingName] = folder.path;
							this.plugin.saveSettings();
						});
				})
				.then((setting) => {
					postProcessFolderPathSetting(setting);
					if (this.plugin.settings[settingName] !== 'folder') {
						setting.settingEl.hide();
					}
				})
		];
	}

	addAttachmentLocationSetting(settingName: KeysOfType<PDFReaderSettings, string>, defaultSubfolder: string, postProcessSettings: (locationSetting: Setting, folderPathSetting: Setting, subfolderPathSetting: Setting) => any) {
		let locationDropdown: DropdownComponent;
		let folderPathText: TextComponent;
		let subfolderPathText: TextComponent;

		const toggleVisibility = () => {
			const value = locationDropdown.getValue();
			folderPathSetting.settingEl.toggle(value === 'folder');
			subfolderPathSetting.settingEl.toggle(value === 'subfolder');
		};
		const getNewAttachmentFolderPath = () => {
			const value = locationDropdown.getValue() as NewAttachmentLocation;
			if (value === 'root') {
				return '/';
			}
			if (value === 'folder') {
				return folderPathText.getValue() || defaultSubfolder;
			}
			if (value === 'current') {
				return './';
			}
			if (value === 'subfolder') {
				return './' + (subfolderPathText.getValue() || defaultSubfolder);
			}
			return ''; // An empty string means matching the Obsidian default
		};
		const setValues = (value: string) => {
			if (value === '') {
				locationDropdown.setValue('obsidian');
				return;
			}
			if (value === '/') {
				locationDropdown.setValue('root');
				return;
			}
			if (value !== '.' && value !== './') {
				if (value.startsWith('./')) {
					const subfolderName = value.slice(2);
					locationDropdown.setValue('subfolder');
					subfolderPathText.setValue(subfolderName !== defaultSubfolder ? subfolderName : '');
					return;
				}
				locationDropdown.setValue('folder');
				folderPathText.setValue(value !== defaultSubfolder ? value : '');
				return;
			}
			locationDropdown.setValue('current');
			return;
		};

		const locationSetting = this.addSetting(settingName)
			.addDropdown((dropdown) => {
				dropdown.onChange(async () => {
					toggleVisibility();
					// @ts-ignore
					this.plugin.settings[settingName] = getNewAttachmentFolderPath();
					await this.plugin.saveSettings();
				});
				dropdown.addOptions(NEW_ATTACHMENT_LOCATIONS);
				locationDropdown = dropdown;
			});
		const folderPathSetting = this.addSetting()
			.addText((text) => {
				text.setPlaceholder(defaultSubfolder)
					.onChange(async () => {
						// @ts-ignore
						this.plugin.settings[settingName] = getNewAttachmentFolderPath();
						await this.plugin.saveSettings();
					});
				new FuzzyFolderSuggest(this.app, text.inputEl)
					.onSelect(() => {
						setTimeout(async () => {
							// @ts-ignore
							this.plugin.settings[settingName] = getNewAttachmentFolderPath();
							await this.plugin.saveSettings();
						});
					});
				folderPathText = text;
			});
		const subfolderPathSetting = this.addSetting()
			.addText((text) => {
				text.setPlaceholder(defaultSubfolder)
					.onChange(async () => {
						// @ts-ignore
						this.plugin.settings[settingName] = getNewAttachmentFolderPath();
						await this.plugin.saveSettings();
					});
				subfolderPathText = text;
			});

		postProcessSettings(locationSetting, folderPathSetting, subfolderPathSetting);

		setValues(this.plugin.settings[settingName]);
		toggleVisibility();
	}


	async renderMarkdown(lines: string[] | string, el: HTMLElement) {
		this.promises.push(this._renderMarkdown(lines, el));
		el.addClass('markdown-rendered');
	}

	async _renderMarkdown(lines: string[] | string, el: HTMLElement) {
		await MarkdownRenderer.render(this.app, Array.isArray(lines) ? lines.join('\n') : lines, el, '', this.component);
		if (el.childNodes.length === 1 && el.firstChild instanceof HTMLParagraphElement) {
			el.replaceChildren(...el.firstChild.childNodes);
		}
	}

	addColorSetting(index: number) {
		const colors = this.plugin.settings.colors;
		let [name, color] = Object.entries(colors)[index];
		let previousColor = color;
		return this.addSetting()
			.addText((text) => {
				text.setPlaceholder('Color name (case-insensitive)')
					.then((text) => {
						text.inputEl.size = text.inputEl.placeholder.length;
						setTooltip(text.inputEl, 'Color name (case-insensitive)');
					})
					.setValue(name)
					.onChange(async (newName) => {
						if (newName in colors) {
							new Notice('This color name is already used.');
							text.inputEl.addClass('error');
							return;
						}
						text.inputEl.removeClass('error');
						delete colors[name];

						for (const key of ['defaultColor', 'backlinkHoverColor'] as const) {
							const setting = this.items[key];
							if (setting) {
								const optionEl = (setting.components[0] as DropdownComponent).selectEl.querySelector<HTMLOptionElement>(`:scope > option:nth-child(${index + 2})`);
								if (optionEl) {
									optionEl.value = newName;
									optionEl.textContent = newName;
								}
							}
						}

						if (this.plugin.settings.defaultColor === name) {
							this.plugin.settings.defaultColor = newName;
						}
						name = newName;
						colors[name] = color;
						await this.plugin.saveSettings();
						this.plugin.loadStyle();
					});
			})
			.addColorPicker((picker) => {
				picker.setValue(color);
				picker.onChange(async (newColor) => {
					previousColor = color;
					color = newColor;
					colors[name] = color;
					await this.plugin.saveSettings();
					this.plugin.loadStyle();
				});
			})
			.addExtraButton((button) => {
				button.setIcon('rotate-ccw')
					.setTooltip('Return to previous color')
					.onClick(async () => {
						color = previousColor;
						colors[name] = color;
						await this.plugin.saveSettings();
						this.plugin.loadStyle();
						this.redisplay();
					});
			})
			.addExtraButton((button) => {
				button.setIcon('trash')
					.setTooltip('Delete')
					.onClick(async () => {
						if (this.plugin.settings.defaultColor === name) {
							this.plugin.settings.defaultColor = '';
						}
						delete colors[name];
						await this.plugin.saveSettings();
						this.plugin.loadStyle();
						this.redisplay();
					});
			});
	}

	addNameValuePairListSetting<Item>(items: Item[], index: number, defaultIndexKey: KeysOfType<PDFReaderSettings, number>, accesors: {
		getName: (item: Item) => string,
		setName: (item: Item, value: string) => void,
		getValue: (item: Item) => string,
		setValue: (item: Item, value: string) => void,
	}, configs: {
		name: {
			placeholder: string,
			formSize: number,
			duplicateMessage: string,
		},
		value: {
			placeholder: string,
			formSize: number,
			formRows?: number, // for multi-line value
		},
		delete: {
			deleteLastMessage: string,
		}
	}) {
		const { getName, setName, getValue, setValue } = accesors;
		const item = items[index];
		const name = getName(item);
		const value = getValue(item);

		return this.addSetting()
			.addText((text) => {
				text.setPlaceholder(configs.name.placeholder)
					.then((text) => {
						text.inputEl.size = configs.name.formSize;
						setTooltip(text.inputEl, configs.name.placeholder);
					})
					.setValue(name)
					.onChange(async (newName) => {
						if (items.some((item) => getName(item) === newName)) {
							new Notice(configs.name.duplicateMessage);
							text.inputEl.addClass('error');
							return;
						}
						text.inputEl.removeClass('error');
						setName(item, newName);

						const setting = this.items[defaultIndexKey];
						if (setting) {
							const optionEl = (setting.components[0] as DropdownComponent).selectEl.querySelector<HTMLOptionElement>(`:scope > option:nth-child(${index + 1})`);
							if (optionEl) {
								optionEl.value = newName;
								optionEl.textContent = newName;
							}
						}

						await this.plugin.saveSettings();
					});
			})
			.then((setting) => {
				if (configs.value.hasOwnProperty('formRows')) {
					setting.addTextArea((textarea) => {
						textarea.setPlaceholder(configs.value.placeholder)
							.then((textarea) => {
								textarea.inputEl.rows = configs.value.formRows!;
								textarea.inputEl.cols = configs.value.formSize;
								setTooltip(textarea.inputEl, configs.value.placeholder);
							})
							.setValue(value)
							.onChange(async (newValue) => {
								setValue(item, newValue);
								await this.plugin.saveSettings();
							});
					});
				} else {
					setting.addText((textarea) => {
						textarea.setPlaceholder(configs.value.placeholder)
							.then((text) => {
								text.inputEl.size = configs.value.formSize;
								setTooltip(text.inputEl, configs.value.placeholder);
							})
							.setValue(value)
							.onChange(async (newValue) => {
								setValue(item, newValue);
								await this.plugin.saveSettings();
							});
					});
				}
			})
			.addExtraButton((button) => {
				button.setIcon('trash')
					.setTooltip('Delete')
					.onClick(async () => {
						if (items.length === 1) {
							new Notice(configs.delete.deleteLastMessage);
							return;
						}
						items.splice(index, 1);
						if (this.plugin.settings[defaultIndexKey] > index) {
							this.plugin.settings[defaultIndexKey]--;
						} else if (this.plugin.settings[defaultIndexKey] === index) {
							// @ts-ignore
							this.plugin.settings[defaultIndexKey] = 0;
						}
						await this.plugin.saveSettings();
						this.redisplay();
					});
			})
			.setClass('no-border');
	}

	addNamedTemplatesSetting(items: NamedTemplate[], index: number, defaultIndexKey: KeysOfType<PDFReaderSettings, number>, configs: Parameters<PDFReaderSettingTab['addNameValuePairListSetting']>[4]) {
		return this.addNameValuePairListSetting(
			items,
			index,
			defaultIndexKey, {
			getName: (item) => item.name,
			setName: (item, value) => { item.name = value; },
			getValue: (item) => item.template,
			setValue: (item, value) => { item.template = value; },
		}, configs);
	}

	addDisplayTextSetting(index: number) {
		return this.addNamedTemplatesSetting(
			this.plugin.settings.displayTextFormats,
			index,
			'defaultDisplayTextFormatIndex', {
			name: {
				placeholder: 'Format name',
				formSize: 30,
				duplicateMessage: 'This format name is already used.',
			},
			value: {
				placeholder: 'Display text format',
				formSize: 50,
			},
			delete: {
				deleteLastMessage: 'You cannot delete the last display text format.',
			}
		});
	}

	addCopyCommandSetting(index: number) {
		return this.addNamedTemplatesSetting(
			this.plugin.settings.copyCommands,
			index,
			'defaultColorPaletteActionIndex', {
			name: {
				placeholder: 'Format name',
				formSize: 30,
				duplicateMessage: 'This format name is already used.',
			},
			value: {
				placeholder: 'Copied text format',
				formSize: 50,
				formRows: 3,
			},
			delete: {
				deleteLastMessage: 'You cannot delete the last copy format.',
			}
		});
	}

	addHotkeySettingButton(setting: Setting, query?: string) {
		setting.addButton((button) => {
			button.setButtonText('Open hotkeys settings')
				.onClick(() => {
					this.plugin.openHotkeySettingTab(query);
				});
		});
	}

	addPagePreviewSettingButton(setting: Setting) {
		return setting
			.addButton((button) => {
				button.setButtonText('Open page preview settings')
					.onClick(() => {
						this.app.setting.openTabById('page-preview');
					});
			});
	}

	addRequireModKeyOnHoverSetting(id: string) {
		const display = this.app.workspace.hoverLinkSources[id].display;
		const required = this.plugin.requireModKeyForLinkHover(id);
		return this.addSetting()
			.setName(`Require ${modKey} key while hovering`)
			.setDesc(`Currently ${required ? 'required' : 'not required'}. You can toggle this on and off in the core Page Preview plugin settings > ${display}.`)
			.then((setting) => this.addPagePreviewSettingButton(setting));
	}

	addIconSetting(settingName: KeysOfType<PDFReaderSettings, string>, leaveBlankToRemoveIcon: boolean) {
		const normalizeIconNameNoPrefix = (name: string) => {
			if (name.startsWith('lucide-')) {
				return name.slice(7);
			}
			return name;
		};

		const normalizeIconNameWithPrefix = (name: string) => {
			if (!name.startsWith('lucide-')) {
				return 'lucide-' + name;
			}
			return name;
		};

		const renderAndValidateIcon = (setting: Setting) => {
			const iconPreviewEl = setting.controlEl.querySelector<HTMLElement>(':scope>.icon-preview')
				?? setting.controlEl.createDiv('icon-preview');
			setIcon(iconPreviewEl, normalizeIconNameWithPrefix(this.plugin.settings[settingName]));

			const text = setting.components[0] as TextComponent;
			if ((!leaveBlankToRemoveIcon || this.plugin.settings[settingName]) && !iconPreviewEl.childElementCount) {
				text.inputEl.addClass('error');
				setTooltip(text.inputEl, 'No icon found');
			} else {
				text.inputEl.removeClass('error');
				setTooltip(text.inputEl, '');
			}
		};

		return this.addTextSetting(settingName, undefined, (setting) => {
			// @ts-ignore
			this.plugin.settings[settingName] = normalizeIconNameNoPrefix(this.plugin.settings[settingName]);
			this.plugin.saveSettings();
			renderAndValidateIcon(setting);
		})
			.then((setting) => {
				this.renderMarkdown([
					'You can use any icon from [Lucide](https://lucide.dev/icons).'
					+ (leaveBlankToRemoveIcon ? ' Leave blank to remove icons.' : ''),
				], setting.descEl);
			})
			.then(renderAndValidateIcon);
	}

	addProductMenuSetting(key: KeysOfType<PDFReaderSettings, ('color' | 'copy-format' | 'display')[]>, heading: string) {
		const categories = DEFAULT_SETTINGS[key];
		const displayNames: Record<string, string> = {
			'color': 'Colors',
			'copy-format': 'Copy format',
			'display': 'Display text format',
		};
		const values = this.plugin.settings[key];

		const setting = this.addHeading(heading, key);

		setting.addExtraButton((button) => {
			button
				.setTooltip('Reset')
				.setIcon('rotate-ccw')
				.onClick(() => {
					values.length = 0;
					// @ts-ignore
					values.push(...categories);
					this.redisplay();
				});
		});

		const dropdowns: DropdownComponent[] = [];
		const remainingCategories: string[] = categories.slice();

		for (let i = 0; i < categories.length; i++) {
			if (i > 0) {
				if (!Platform.isDesktopApp) {
					// On the mobile app, nested menus don't work, so we only show the top-level items.
					return;
				}

				const upperLevelCategory = dropdowns[i - 1].getValue();
				if (!upperLevelCategory) return;

				remainingCategories.remove(upperLevelCategory);
			}

			this.addSetting()
				.then((setting) => {
					if (Platform.isDesktopApp) {
						setting.setName(i === 0 ? 'Top-level menu' : i === 1 ? 'Submenu' : 'Subsubmenu');
					}
				})
				.addDropdown((dropdown) => {
					for (const category of remainingCategories) {
						dropdown.addOption(category, displayNames[category]);
					}
					if (i > 0) dropdown.addOption('', 'None');

					let currentValue: string = values[i] ?? '';
					if (currentValue && !remainingCategories.includes(currentValue)) {
						if (remainingCategories[0]) {
							// @ts-ignore
							values[i] = remainingCategories[0];
							currentValue = values[i];
						}
					}
					dropdown.setValue(currentValue)
						.onChange((value) => {
							if (value) {
								// @ts-ignore
								values[i] = value;
							} else {
								while (values.length > i) values.pop();
							}

							this.plugin.saveSettings();
							this.redisplay();
						});
					dropdowns.push(dropdown);
				})
				.then((setting) => {
					setting.settingEl.addClasses(['no-border', 'small-padding']);
				});
		}

		return setting;
	}

	createLinkTo(id: keyof PDFReaderSettings, name?: string) {
		return createEl('a', '', (el) => {
			el.onclick = (evt) => {
				this.scrollTo(id, { behavior: 'smooth' });
			};
			activeWindow.setTimeout(() => {
				const setting = this.items[id];
				if (!name && setting) {
					name = '"' + setting.nameEl.textContent + '"';
				}
				el.setText(name ?? '');
			});
		});
	}

	createLinkToHeading(id: string, name?: string) {
		return createEl('a', '', (el) => {
			el.onclick = (evt) => {
				this.scrollToHeading(id, { behavior: 'smooth' });
			};
			activeWindow.setTimeout(() => {
				const setting = this.headings.get(id);
				if (!name && setting) {
					name = '"' + setting.nameEl.textContent + '"';
				}
				el.setText(name ?? '');
			});
		});
	}

	/** Refresh the setting tab and then scroll back to the original position. */
	redisplay() {
		const scrollTop = this.contentEl.scrollTop;
		this.display();
		this.contentEl.scroll({ top: scrollTop });

		this.events.trigger('update');
	}

	async display(): Promise<void> {
		this.contentEl.empty();
		this.promises = [];
		this.component.load();

		this.addHeading('Core PDF Settings', 'core-settings');

		this.addTextSetting('proxyMDProperty')
			.setName('Associated Note Property')
			.setDesc('The property in your markdown note that links to the PDF (e.g., "source" or "PDF").');


		this.addTextSetting('newPDFFolderPath')
			.setName('Auto-create Target Folder')
			.setDesc('Folder where new associated notes will be created (e.g., "References").')
			.then((setting) => {
				const inputEl = (setting.components[0] as TextComponent).inputEl;
				new FuzzyFolderSuggest(this.app, inputEl)
					.onSelect(({ item: folder }) => {
						this.plugin.settings.newPDFFolderPath = folder.path;
						this.plugin.saveSettings();
						this.redisplay();
					});
			});

		this.addTextSetting('newFileTemplatePath')
			.setName('Auto-create Template')
			.setDesc('Markdown file to use as a template for new associated notes.')
			.then((setting) => {
				const inputEl = (setting.components[0] as TextComponent).inputEl;
				new FuzzyMarkdownFileSuggest(this.app, inputEl)
					.onSelect(({ item: file }) => {
						this.plugin.settings.newFileTemplatePath = file.path;
						this.plugin.saveSettings();
						this.redisplay();
					});
			});

		this.addToggleSetting('autoSync')
			.setName('Auto-sync Annotations')
			.setDesc('Automatically sync annotations from PDF to the associated note when the PDF is modified.');

		this.addHeading('Annotation & Writing', 'annotation-writing');

		this.addToggleSetting('enablePDFEdit')
			.setName('Enable PDF Annotation Writing')
			.setDesc('Allow the plugin to write highlights directly into the PDF file. This requires an "Annotation Author" name below.');

		this.addTextSetting('author')
			.setName('Annotation Author')
			.setDesc('The name that will be recorded as the author of the annotations written into the PDF.');

		this.addSliderSetting('writeHighlightToFileOpacity', 0.1, 1, 0.05)
			.setName('PDF Highlight Opacity')
			.setDesc('The transparency of highlights written into the PDF file (0.1: transparent, 1: opaque).');

		this.addHeading('Interface & Toolbars', 'ui-settings');

		this.addToggleSetting('colorPaletteInToolbar')
			.setName('Show color palette in reader toolbar')
			.setDesc('Show color selection icons in the top toolbar of the PDF reader view.');

		this.addToggleSetting('colorPaletteInEmbedToolbar')
			.setName('Show color palette in PDF embeds')
			.setDesc('Show color selection icons in the toolbar of embedded PDF files.');

		this.addToggleSetting('noColorButtonInColorPalette')
			.setName('Show "No color" button')
			.setDesc('Show a transparent button in the color palette to copy links without specifying a color.');

		this.addHeading('Color Customization', 'color-customization');

		const colorNames = Object.keys(this.plugin.settings.colors);
		this.addDropdownSetting('defaultColor', ['', ...colorNames], (name) => name || 'None')
			.setName('Default Highlight Color')
			.setDesc('The default color to use when none is selected.');

		this.addSetting()
			.setName('Manage Colors')
			.setDesc('Add or remove colors available in the palette.')
			.addButton((btn) => btn.setButtonText('Add Color').onClick(async () => {
				let i = 1;
				while (`New Color ${i}` in this.plugin.settings.colors) i++;
				this.plugin.settings.colors[`New Color ${i}`] = '#ffd000';
				await this.plugin.saveSettings();
				this.redisplay();
			}));

		for (let i = 0; i < Object.keys(this.plugin.settings.colors).length; i++) {
			this.addColorSetting(i);
		}

		this.addHeading('Copy Templates', 'copy-templates');

		this.addSetting()
			.setName('Link Copy Formats')
			.setDesc('Customize the templates for copying links to selections or annotations.')
			.addButton((btn) => btn.setButtonText('Add Format').onClick(async () => {
				this.plugin.settings.copyCommands.push({ name: 'New Format', template: '{{link}}' });
				await this.plugin.saveSettings();
				this.redisplay();
			}));

		for (let i = 0; i < this.plugin.settings.copyCommands.length; i++) {
			this.addCopyCommandSetting(i);
		}

		this.addHeading('Display Text Templates', 'display-text-templates');

		this.addSetting()
			.setName('Display Text Formats')
			.setDesc('Customize how the link text looks (e.g., page number, file name).')
			.addButton((btn) => btn.setButtonText('Add Format').onClick(async () => {
				this.plugin.settings.displayTextFormats.push({ name: 'New Format', template: '{{text}}' });
				await this.plugin.saveSettings();
				this.redisplay();
			}));

		for (let i = 0; i < this.plugin.settings.displayTextFormats.length; i++) {
			this.addDisplayTextSetting(i);
		}

		this.addSetting()
			.setName('Restore All Settings')
			.setDesc('Restore all plugin settings to their default values.')
			.addButton((btn) => btn.setButtonText('Restore Default').setWarning().onClick(async () => {
				if (confirm('Are you sure you want to restore all settings to default?')) {
					await this.plugin.restoreDefaultSettings();
					this.redisplay();
				}
			}));

		await Promise.all(this.promises);
	}
	async hide() {
		this.plugin.settings.colors = Object.fromEntries(
			Object.entries(this.plugin.settings.colors).filter(([name, color]) => name && isHexString(color))
		);
		if (this.plugin.settings.defaultColor && !(this.plugin.settings.defaultColor in this.plugin.settings.colors)) {
			this.plugin.settings.defaultColor = '';
		}
		if (this.plugin.settings.backlinkHoverColor && !(this.plugin.settings.backlinkHoverColor in this.plugin.settings.colors)) {
			this.plugin.settings.backlinkHoverColor = '';
		}

		this.plugin.settings.copyCommands = this.plugin.settings.copyCommands.filter((command) => command.name && command.template);
		this.plugin.settings.displayTextFormats = this.plugin.settings.displayTextFormats.filter((format) => format.name); // allow empty display text formats

		// avoid annotations to be not referneceable
		if (this.plugin.settings.enablePDFEdit && !this.plugin.settings.author) {
			this.plugin.settings.enablePDFEdit = false;
			new Notice(`${this.plugin.manifest.name}: Cannot enable writing highlights into PDF files because the "Annotation author" option is empty.`);
		}

		this.plugin.validateAutoFocusAndAutoPasteSettings();

		await this.plugin.saveSettings();

		this.plugin.loadStyle();

		this.promises = [];
		this.component.unload();
	}
}
