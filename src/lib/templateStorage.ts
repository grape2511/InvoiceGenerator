import { Template } from "@/types/invoice";
import { supabase } from "@/lib/supabase";

const TABLE = "ig_templates";

export async function getTemplates(): Promise<Template[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("data")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => row.data as Template);
}

export async function getTemplate(id: string): Promise<Template | undefined> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("data")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data?.data as Template) ?? undefined;
}

export async function saveTemplate(template: Template): Promise<void> {
  template.updatedAt = new Date().toISOString();
  const { error } = await supabase.from(TABLE).upsert({
    id: template.id,
    data: template,
    updated_at: template.updatedAt,
  });
  if (error) throw new Error(error.message);
}

export async function deleteTemplate(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) throw new Error(error.message);
}
