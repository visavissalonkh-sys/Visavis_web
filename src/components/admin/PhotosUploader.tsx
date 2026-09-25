"use client";

import Image from "next/image";
import { useRef, useState } from "react";

export function PhotosUploader({
  photoUrls,
  onChange,
  purpose,
}: {
  photoUrls: string[];
  onChange: (urls: string[]) => void;
  purpose: "service" | "location";
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList) {
    setError(null);
    setUploading(true);
    try {
      const sigRes = await fetch("/api/admin/uploads/signature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purpose }),
      });
      const sig = await sigRes.json();
      if (!sigRes.ok) {
        setError("Не вдалося підготувати завантаження.");
        return;
      }

      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("api_key", sig.apiKey);
        formData.append("timestamp", String(sig.timestamp));
        formData.append("signature", sig.signature);
        formData.append("folder", sig.folder);

        const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`, {
          method: "POST",
          body: formData,
        });
        const result = await uploadRes.json();
        if (uploadRes.ok && result.secure_url) uploaded.push(result.secure_url);
      }

      if (uploaded.length > 0) onChange([...photoUrls, ...uploaded]);
      if (uploaded.length < files.length) setError("Деякі фото не вдалося завантажити.");
    } catch {
      setError("Немає з'єднання з сервісом фото.");
    } finally {
      setUploading(false);
    }
  }

  function remove(url: string) {
    onChange(photoUrls.filter((u) => u !== url));
  }

  return (
    <div className="flex flex-col gap-3">
      {photoUrls.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {photoUrls.map((url) => (
            <div key={url} className="relative h-20 w-20 overflow-hidden rounded-xl border border-border">
              <Image src={url} alt="Завантажене фото" fill sizes="80px" className="object-cover" />
              <button
                type="button"
                onClick={() => remove(url)}
                aria-label="Видалити фото"
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-xs text-white"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="w-fit rounded-full border border-border-strong px-4 py-1.5 text-sm text-fg-muted transition-colors hover:text-fg disabled:opacity-50"
      >
        {uploading ? "Завантаження…" : "Додати фото"}
      </button>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
