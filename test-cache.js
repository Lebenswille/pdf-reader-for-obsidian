const { Notice } = require('obsidian');
module.exports = (app) => {
    const file = app.vault.getAbstractFileByPath('References/@melis2024.md');
    const cache = app.metadataCache.getFileCache(file);
    new Notice("FM: " + JSON.stringify(cache.frontmatter.source));
    if (cache.frontmatterLinks) {
        new Notice("FMLinks: " + JSON.stringify(cache.frontmatterLinks.map(l => l.link)));
    }
}
