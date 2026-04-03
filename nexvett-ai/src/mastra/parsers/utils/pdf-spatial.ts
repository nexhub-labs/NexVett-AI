import * as pdfjsLib from 'pdfjs-dist';

// Proper Node.js setup: disable the worker by pointing to an empty string.
// pdfjs-dist 5.x supports this without @ts-ignore via GlobalWorkerOptions.
pdfjsLib.GlobalWorkerOptions.workerSrc = '';

export interface TextItem {
    text: string;
    x: number;       // Horizontal position
    y: number;       // Vertical position
    width: number;
    height: number;
    page: number;    // Page number (1-based)
    pageHeight: number; // Full height of the page — used for relative margin calculations
}

/**
 * Extracts text items with their spatial coordinates from a PDF buffer.
 */
export async function extractTextItems(pdfBuffer: Buffer | Uint8Array): Promise<TextItem[]> {
    const data = new Uint8Array(pdfBuffer);

    const loadingTask = pdfjsLib.getDocument({
        data,
        useSystemFonts: true,
        disableFontFace: true,
    });

    const pdf = await loadingTask.promise;
    const items: TextItem[] = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.0 });
        const textContent = await page.getTextContent();

        textContent.items.forEach((item: any) => {
            items.push({
                text: item.str,
                x: item.transform[4],
                y: item.transform[5],
                width: item.width,
                height: item.height,
                page: pageNum,
                pageHeight: viewport.height,
            });
        });
    }

    return items;
}

/**
 * Extracts all text from a PDF buffer as a flat string.
 * Preserves line breaks by grouping items by Y position.
 */
export async function extractText(pdfBuffer: Buffer | Uint8Array): Promise<string> {
    const items = await extractTextItems(pdfBuffer);
    if (items.length === 0) return '';

    // Group items into lines by their Y coordinate (descending = top to bottom)
    const lineMap = new Map<number, string[]>();
    for (const item of items) {
        const lineKey = Math.round(item.y);
        if (!lineMap.has(lineKey)) lineMap.set(lineKey, []);
        lineMap.get(lineKey)!.push(item.text);
    }

    // Sort lines top-to-bottom (higher Y = top of page in PDF coords)
    const sortedKeys = [...lineMap.keys()].sort((a, b) => b - a);
    return sortedKeys.map(k => lineMap.get(k)!.join(' ')).join('\n');
}
