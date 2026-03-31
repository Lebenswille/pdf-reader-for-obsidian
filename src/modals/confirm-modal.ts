import { ButtonComponent, Setting } from "obsidian";
import { PDFReaderModal } from "./base-modal";
import PDFReader from "../main";

export class ConfirmModal extends PDFReaderModal {
	private onConfirm: () => void;
	private onCancel?: () => void;
	private message: string;
	private subMessage?: string;
	private confirmText: string;
	private cancelText: string;

	constructor(
		plugin: PDFReader,
		message: string,
		onConfirm: () => void,
		options: {
			subMessage?: string;
			confirmText?: string;
			cancelText?: string;
			onCancel?: () => void;
		} = {},
	) {
		super(plugin);
		this.message = message;
		this.onConfirm = onConfirm;
		this.subMessage = options.subMessage;
		this.confirmText = options.confirmText ?? "Confirm";
		this.cancelText = options.cancelText ?? "Cancel";
		this.onCancel = options.onCancel;
	}

	onOpen(): void {
		super.onOpen();
		this.titleEl.setText(this.message);
		if (this.subMessage) {
			this.contentEl.createEl("p", { text: this.subMessage });
		}

		const btnContainer = this.contentEl.createDiv("modal-button-container");
		new ButtonComponent(btnContainer)
			.setButtonText(this.confirmText)
			.setCta()
			.onClick(() => {
				this.close();
				this.onConfirm();
			});

		new ButtonComponent(btnContainer).setButtonText(this.cancelText).onClick(() => {
			this.close();
			this.onCancel?.();
		});
	}
}
