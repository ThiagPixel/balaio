"use client";

import { useState, useTransition } from "react";

import { createClient } from "@/lib/supabase/client";

type ImageUploadProps = {
  name: string;
  label?: string;
  hint?: string;
  defaultValue?: string | null;
  error?: string;
};

export function ImageUpload({
  name,
  label,
  hint,
  defaultValue,
  error,
}: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(
    defaultValue ?? null,
  );
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    // Validações básicas
    const validTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    ];
    if (!validTypes.includes(file.type)) {
      setUploadError(
        "Tipo de arquivo inválido. Use JPEG, PNG, WebP ou GIF.",
      );
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError("A imagem deve ter no máximo 10MB.");
      return;
    }

    setUploadError(null);
    setUploading(true);

    // Cria preview local
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Faz upload para o Supabase Storage
    startTransition(async () => {
      try {
        const supabase = createClient();

        // Gera nome único para o arquivo
        const ext = file.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;

        const { data, error: uploadError } =
          await supabase.storage
            .from("product-images")
            .upload(fileName, file, {
              cacheControl: "3600",
              upsert: false,
            });

        if (uploadError) {
          console.error(
            "Erro ao fazer upload:",
            uploadError,
          );
          setUploadError(
            "Não foi possível fazer upload da imagem.",
          );
          setPreview(null);
          setUploading(false);
          return;
        }

        // Obtém URL pública da imagem
        const { data: urlData } =
          supabase.storage
            .from("product-images")
            .getPublicUrl(data.path);

        // Define o valor no input hidden
        const input =
          document.querySelector<HTMLInputElement>(
            `input[name="${name}"]`,
          );
        if (input) {
          input.value = urlData.publicUrl;
        }

        setPreview(urlData.publicUrl);
      } catch (err) {
        console.error("Erro inesperado:", err);
        setUploadError(
          "Ocorreu um erro inesperado ao fazer upload.",
        );
        setPreview(null);
      } finally {
        setUploading(false);
      }
    });
  }

  function handleRemove() {
    setPreview(null);
    setUploadError(null);

    // Limpa o input hidden
    const input =
      document.querySelector<HTMLInputElement>(
        `input[name="${name}"]`,
      );
    if (input) {
      input.value = "";
    }

    // Limpa o input de arquivo
    const fileInput =
      document.querySelector<HTMLInputElement>(
        `input[type="file"]`,
      );
    if (fileInput) {
      fileInput.value = "";
    }
  }

  return (
    <div className="w-full">
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-slate-700">
          {label}
        </label>
      )}

      {/* Input hidden para armazenar a URL */}
      <input type="hidden" name={name} value={preview ?? ""} />

      {/* Área de upload */}
      <div className="mt-1">
        {preview ? (
          // Preview da imagem
          <div className="relative inline-block">
            <img
              src={preview}
              alt="Preview"
              className="h-32 w-32 rounded-lg border border-slate-200 object-cover"
            />
            <button
              type="button"
              onClick={handleRemove}
              disabled={uploading}
              className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              ×
            </button>
          </div>
        ) : (
          // Área de upload
          <label
            className={`flex h-32 w-32 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 transition-colors hover:border-slate-400 ${
              uploading ? "pointer-events-none opacity-50" : ""
            }`}
          >
            {uploading ? (
              <span className="text-sm text-slate-500">
                Enviando...
              </span>
            ) : (
              <>
                <span className="text-2xl text-slate-400">
                  +
                </span>
                <span className="mt-1 text-xs text-slate-500">
                  Adicionar foto
                </span>
              </>
            )}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleFileChange}
              disabled={uploading}
              className="sr-only"
            />
          </label>
        )}
      </div>

      {/* Hint */}
      {hint && !error && !uploadError && (
        <p className="mt-1 text-xs text-slate-500">{hint}</p>
      )}

      {/* Erro do campo */}
      {(error || uploadError) && (
        <p className="mt-1 text-xs text-red-600">
          {error ?? uploadError}
        </p>
      )}
    </div>
  );
}
