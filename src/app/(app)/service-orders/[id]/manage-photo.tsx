"use client";
/* eslint-disable @next/next/no-img-element -- Prévia local de imagem comprimida. */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { prepareServiceOrderImage } from "@/lib/service-order-image";

export function ManageOrderPhoto({ orderId, tenantId, hasPhoto }: {
  orderId: string; tenantId: string; hasPhoto: boolean;
}) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function choose(original?: File) {
    setError(""); setFile(null);
    if (!original) return;
    setBusy(true);
    try { setFile(await prepareServiceOrderImage(original)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Foto inválida."); }
    finally { setBusy(false); }
  }
  async function save() {
    if (!file) return;
    setBusy(true); setError("");
    const supabase = createClient();
    const path = `${tenantId}/${orderId}/${crypto.randomUUID()}.${file.type === "image/webp" ? "webp" : "jpg"}`;
    try {
      const { error: uploadError } = await supabase.storage.from("service-order-images")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;
      const { data: oldPath, error: replaceError } = await supabase.rpc("replace_service_order_image", {
        p_order_id: orderId, p_object_path: path,
      });
      if (replaceError) {
        await supabase.storage.from("service-order-images").remove([path]);
        throw replaceError;
      }
      if (oldPath) await supabase.storage.from("service-order-images").remove([oldPath as string]);
      setFile(null); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível trocar a foto."); }
    finally { setBusy(false); }
  }
  async function remove() {
    if (!window.confirm("Remover a foto desta OS?")) return;
    setBusy(true); setError("");
    const supabase = createClient();
    try {
      const { data: oldPath, error: removeError } = await supabase.rpc("remove_service_order_image", { p_order_id: orderId });
      if (removeError) throw removeError;
      if (oldPath) await supabase.storage.from("service-order-images").remove([oldPath as string]);
      setFile(null); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível remover a foto."); }
    finally { setBusy(false); }
  }
  return <details className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
    <summary className="cursor-pointer text-sm font-medium text-brand-600">{hasPhoto ? "Trocar ou remover foto" : "Adicionar foto"}</summary>
    <div className="mt-4 space-y-3">
      <p className="text-xs text-slate-500">JPG, PNG ou WebP. A foto é reduzida a até 1 MB antes do envio.</p>
      <input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy}
        onChange={(event) => void choose(event.target.files?.[0])}
        className="block w-full text-sm text-slate-700" />
      {preview && <img src={preview} alt="Prévia da nova foto" className="max-h-40 max-w-full rounded-md border object-contain" />}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <div className="flex gap-3">
        <button type="button" onClick={() => void save()} disabled={busy || !file}
          className="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">{busy ? "Aguarde..." : "Salvar foto"}</button>
        {hasPhoto && <button type="button" onClick={() => void remove()} disabled={busy}
          className="text-sm font-medium text-red-700 disabled:opacity-50">Remover foto</button>}
      </div>
    </div>
  </details>;
}
