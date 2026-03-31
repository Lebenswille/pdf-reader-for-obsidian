# PDF Reader: Professional PDF Workspace for Obsidian

**PDF Reader** transforms Obsidian's built-in PDF viewer into a professional research workspace. It treats **PDF highlights as dynamic backlinks**, ensuring your knowledge remains as accessible as your standard Markdown notes.

### Why this version?
Obsidian's native viewer is great for reading, but limited for active research. This project bridges that gap by providing a **stable, native-first experience** that focuses on reducing the friction between reading and note-taking.

### Key Enhancements
*   ✨ **Selection SelectionToolbar**: A unique floating palette that appears at your cursor for instant color marking and note capture.
*   🔗 **Backlink = Annotation**: Your highlights are generated dynamically from your notes—meaning your annotations are permanent and portable.
*   🖋️ **Professional Workflow**: Optimized for high-frequency annotation with a "one-step" highlight + comment system (MarginNote-style).
*   🛠️ **Deep Integration**: Seamlessly supports Obsidian's native hover-previews, backlink syncing, and Vim keybindings.

---

The core logic of this plugin provides several powerful features:
- **Bi-directional Annotation**: Transforms backlinks into highlight annotations in PDFs and allows editing PDF files directly to save permanent annotations.
- **Smart Link Management**: Advanced templating system for copying links, automatic backlink filtering by page, and "hover sync" between the viewer and the backlinks pane.
- **PDF Page & Outline Editing**: Built-in tools for composing PDF pages (insert/remove/extract) and editing the table of contents (outline).
- **Workflow Optimization**: Includes a color palette for fast highlighting, Vim-like keybindings, and deep integration with other plugins like Hover Editor.

## Getting Started

### 1. Installation
*   **Manual**: Download the `main.js`, `manifest.json`, and `styles.css` from the latest release and place them in `.obsidian/plugins/pdf-reader/`.

### 2. Basic Usage
*   **Selection SelectionToolbar**: Select any text in a PDF to trigger the floating toolbar. Choose a color to instantly highlight and create a backlink.
*   **One-Step Annotating**: Type your thoughts in the floating toolbar's input field before clicking a color to sync the highlight and comment to your active note.
*   **Hover Sync**: Hover over highlighed text in the PDF to preview its backlink, or hover over a backlink in your note to highlight the section in the PDF.
*   **PDF Editing**: Enable "PDF Edit" in settings to save annotations directly into the PDF file.

## Credits & Compatibility
Special thanks to the original author, [RyotaUshio](https://github.com/RyotaUshio/obsidian-pdf-reader), for creating the foundation of this project.

Built with [Mozilla's PDF.js](https://mozilla.github.io/pdf.js/), [monkey-around](https://github.com/pjeby/monkey-around), and [pdf-lib](https://github.com/Hopding/pdf-lib).

Seamlessly supports [Hover Editor](https://github.com/nothingislost/obsidian-hover-editor) and [Better Search Views](https://github.com/ivan-lednev/better-search-views).
