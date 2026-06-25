"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireTenant } from "@/lib/supabase/tenant";
import { slugify } from "@/lib/utils";

const tenantSchema = z.object({
  name: z.string().min(2, "Nome muito curto"),
  slug: z
    .string()
    .min(2, "Slug muito curto")
    .regex(/^[a-z0-9-]+$/, "Use apenas letras minúsculas, números e hífens"),
});

export type TenantState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: string;
} | null;

export async function updateTenant(
  _prev: TenantState,
  formData: FormData
): Promise<TenantState> {
  const raw = {
    name: formData.get("name") as string,
    slug: (formData.get("slug") as string) || "",
  };

  const parsed = tenantSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    parsed.error.errors.forEach((e) => {
      if (e.path[0]) fieldErrors[e.path[0] as string] = e.message;
    });
    return { error: "Verifique os campos", fieldErrors };
  }

  const { supabase, tenantId } = await requireTenant();
  const { error } = await supabase
    .from("tenants")
    .update({
      name: parsed.data.name,
      slug: parsed.data.slug,
    })
    .eq("id", tenantId);

  if (error) {
    if (error.code === "23505") {
      return { error: "Este slug já está em uso por outra empresa" };
    }
    return { error: error.message };
  }

  revalidatePath("/settings");
  revalidatePath("/", "layout");
  return { success: "Configurações salvas!" };
}

export async function suggestSlugFromName(name: string) {
  return slugify(name);
}
