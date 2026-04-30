import { Template } from "@/types/invoice";

const STORAGE_KEY = "templates";

export function getTemplates(): Template[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

export function getTemplate(id: string): Template | undefined {
  return getTemplates().find((t) => t.id === id);
}

export function saveTemplate(template: Template): void {
  const templates = getTemplates();
  const index = templates.findIndex((t) => t.id === template.id);
  template.updatedAt = new Date().toISOString();
  if (index >= 0) {
    templates[index] = template;
  } else {
    templates.push(template);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}

export function deleteTemplate(id: string): void {
  const templates = getTemplates().filter((t) => t.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}
