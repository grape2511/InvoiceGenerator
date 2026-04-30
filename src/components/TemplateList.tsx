"use client";

import { Template } from "@/types/invoice";

interface Props {
  templates: Template[];
  onSelect: (id: string) => void;
  onUse: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function TemplateList({
  templates,
  onSelect,
  onUse,
  onDelete,
}: Props) {
  if (templates.length === 0) {
    return (
      <div className="text-center py-20 text-gray-400">
        <svg
          className="w-16 h-16 mx-auto mb-4 opacity-50"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M19 11H5m14-4H5m14 8H5m14 4H5"
          />
        </svg>
        <p className="text-lg">No templates yet</p>
        <p className="text-sm mt-1">
          Create a template to reuse for invoices to the same company
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 font-medium text-gray-600">
                Name
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">
                Bill To
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">
                Currency
              </th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {templates
              .sort(
                (a, b) =>
                  new Date(b.updatedAt).getTime() -
                  new Date(a.updatedAt).getTime()
              )
              .map((t) => {
                const billToFirstLine = t.billTo.split("\n")[0] || "—";
                return (
                  <tr
                    key={t.id}
                    className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                    onClick={() => onSelect(t.id)}
                  >
                    <td className="px-4 py-3 font-medium">
                      {t.name || <span className="text-gray-400">Unnamed</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {billToFirstLine}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{t.currency}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onUse(t.id);
                        }}
                        className="text-emerald-600 hover:text-emerald-800 font-medium mr-4"
                        title="Create invoice from this template"
                      >
                        Use
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(t.id);
                        }}
                        className="text-red-400 hover:text-red-600"
                        title="Delete"
                      >
                        <svg
                          className="w-4 h-4 inline"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
