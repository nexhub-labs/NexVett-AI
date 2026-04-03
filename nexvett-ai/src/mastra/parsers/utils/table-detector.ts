import { TextItem } from './pdf-spatial';

/**
 * Clusters positions (x or y) based on a tolerance.
 */
export function clusterPositions(positions: number[], tolerance: number): number[] {
    if (positions.length === 0) return [];

    const sorted = [...new Set(positions)].sort((a, b) => a - b);
    const clusters: number[] = [];
    let currentCluster = sorted[0];

    for (let i = 1; i < sorted.length; i++) {
        if (sorted[i] - currentCluster > tolerance) {
            clusters.push(currentCluster);
            currentCluster = sorted[i];
        }
    }
    clusters.push(currentCluster);

    return clusters;
}

/**
 * Detects column boundaries by clustering X positions.
 * Excludes items in the top 10% and bottom 5% of each page to skip headers/footers.
 */
export function detectTableColumns(items: TextItem[]): number[] {
    const xPositions = items
        .filter(item => {
            const topMargin = item.pageHeight * 0.90;    // exclude top 10% (headers)
            const bottomMargin = item.pageHeight * 0.05; // exclude bottom 5% (footers)
            return item.y > bottomMargin && item.y < topMargin;
        })
        .map(item => item.x);

    return clusterPositions(xPositions, 10).sort((a, b) => a - b);
}

/**
 * Groups text items into rows based on Y position.
 * Handles multiline cells by grouping items within a vertical threshold.
 */
export function groupIntoRows(items: TextItem[], rowHeightThreshold: number = 20): TextItem[][] {
    if (items.length === 0) return [];

    // Sort by Y position descending — higher Y = top of page in PDF coordinates.
    const sorted = [...items].sort((a, b) => b.y - a.y);

    const rows: TextItem[][] = [];
    let currentRow: TextItem[] = [];
    let lastY = sorted[0].y;

    for (const item of sorted) {
        if (Math.abs(item.y - lastY) <= rowHeightThreshold) {
            currentRow.push(item);
        } else {
            if (currentRow.length > 0) rows.push(currentRow);
            currentRow = [item];
        }
        lastY = item.y;
    }

    if (currentRow.length > 0) rows.push(currentRow);

    return rows;
}

/**
 * Assigns items in a row to columns based on their X coordinates.
 */
export function assignItemsToColumns(row: TextItem[], columns: number[]): TextItem[][] {
    const cells: TextItem[][] = Array(columns.length).fill(null).map(() => []);

    for (const item of row) {
        const colIndex = columns.findIndex((colX, i) => {
            const nextColX = columns[i + 1] ?? Infinity;
            return item.x >= colX - 5 && item.x < nextColX - 5;
        });

        if (colIndex >= 0) cells[colIndex].push(item);
    }

    return cells;
}
