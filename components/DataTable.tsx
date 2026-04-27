'use client';
import React from 'react';

interface DataTableProps {
  columns: string[];
  rows: Record<string, string | number>[];
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

export default function DataTable({
  columns,
  rows,
  page,
  pageSize,
  total,
  onPageChange,
}: DataTableProps) {
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="w-full">
        <thead className="border-b border-gray-200 bg-gray-50">
          <tr>
            {columns.map((col) => (
              <th key={col} className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length > 0 ? (
            rows.map((row, idx) => (
              <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                {columns.map((col) => (
                  <td key={`${idx}-${col}`} className="px-6 py-4 text-sm text-gray-700">
                    {row[col]}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} className="px-6 py-8 text-center text-gray-500">
                No data available
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-6 py-4">
        <span className="text-sm text-gray-600">
          Page {page} of {totalPages} | Total: {total}
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
            className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:bg-gray-300"
          >
            Previous
          </button>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page === totalPages}
            className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:bg-gray-300"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}