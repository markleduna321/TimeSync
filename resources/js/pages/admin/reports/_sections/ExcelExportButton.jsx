import React from 'react';
import * as XLSX from 'xlsx';
import { FileSpreadsheet } from 'lucide-react';

/**
 * Client-side Excel export button.
 *
 * @param {Array}  rows        Array of objects — each key becomes a column header.
 * @param {string} filename    Filename without extension.
 * @param {string} sheetName   Sheet tab name.
 * @param {Array}  columns     Optional [{ key, header }] to control column order & labels.
 */
export default function ExcelExportButton({ rows = [], filename = 'report', sheetName = 'Sheet1', columns }) {
    function handleExport() {
        if (!rows.length) return;

        let exportRows = rows;
        if (columns) {
            exportRows = rows.map((row) =>
                Object.fromEntries(columns.map(({ key, header }) => [header, row[key] ?? '']))
            );
        }

        const ws = XLSX.utils.json_to_sheet(exportRows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
        XLSX.writeFile(wb, `${filename}.xlsx`);
    }

    return (
        <button
            onClick={handleExport}
            disabled={!rows.length}
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Export to Excel"
        >
            <FileSpreadsheet size={15} />
            Export Excel
        </button>
    );
}
