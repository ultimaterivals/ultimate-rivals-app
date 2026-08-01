import type { ReactNode } from "react";

export interface Column<Row> {
  key: string;
  header: string;
  render: (row: Row) => ReactNode;
}
export function DataTable<Row>({
  columns,
  rows,
  getRowKey,
  caption,
}: {
  columns: readonly Column<Row>[];
  rows: readonly Row[];
  getRowKey: (row: Row) => string;
  caption: string;
}) {
  return (
    <div className="rounded-ur overflow-x-auto border">
      <table className="w-full min-w-xl text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-ur-panel text-xs tracking-wider text-zinc-400 uppercase">
          <tr>
            {columns.map((column) => (
              <th key={column.key} className="px-4 py-3" scope="col">
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={getRowKey(row)} className="border-t hover:bg-white/[.03]">
              {columns.map((column) => (
                <td key={column.key} className="px-4 py-4">
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
