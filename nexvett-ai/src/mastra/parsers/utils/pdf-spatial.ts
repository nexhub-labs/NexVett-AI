import * as pdfjsLib from 'pdfjs-dist';

export interface TextItem {
    text: string;
    x: number;      // Horizontal position
    y: number;      // Vertical position  
    width: number;
    height: number;
    page: number;   // Page number (1-based)
}

/**
 * Extracts text items with their spatial coordinates from a PDF buffer.
 */
export async function extractTextItems(pdfBuffer: Uint8Array): Promise<TextItem[]> {
    const data = new Uint8Array(pdfBuffer);

    // For PDF.js 5.x in Node.js, we explicitly set the worker source
    // to match the main library version to avoid mismatch errors.
    // If running in the main thread (Node.js), disableWorker is the safest.
    const loadingTask = pdfjsLib.getDocument({
        data,
        useSystemFonts: true,
        disableFontFace: true,
        // Forcing main-thread execution in Node.js
        // @ts-ignore
        disableWorker: true,
    });

    const pdf = await loadingTask.promise;
    const items: TextItem[] = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const viewport = page.getViewport({ scale: 1.0 });

        textContent.items.forEach((item: any) => {
            // transform[4] is x, transform[5] is y
            // PDF coordinate system usually starts from bottom-left
            items.push({
                text: item.str,
                x: item.transform[4],
                y: item.transform[5],
                width: item.width,
                height: item.height,
                page: pageNum
            });
        });
    }

    return items;
}
