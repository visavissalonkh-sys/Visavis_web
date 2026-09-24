"use client";

import { useRef, useState } from "react";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

export function AvatarUploader({
  name,
  avatarUrl,
  onUploaded,
  signatureEndpoint = "/api/master/profile/avatar-signature",
}: {
  name: string;
  avatarUrl: string | null;
  onUploaded: (url: string) => void;
  /** Defaults to the master's own profile endpoint; the admin master form
   * passes its own (uploads for an arbitrary/not-yet-created master, so it
   * can't be gated on "the calling user's own master row" the way this
   * default is). */
  signatureEndpoint?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(avatarUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setPreview(URL.createObjectURL(file));
    setUploading(true);

    try {
      const sigRes = await fetch(signatureEndpoint, { method: "POST" });
      const sig = await sigRes.json();
      if (!sigRes.ok) {
        setError("Не вдалося підготувати завантаження.");
        return;
      }

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
      const uploaded = await uploadRes.json();

      if (!uploadRes.ok || !uploaded.secure_url) {
        setError("Не вдалося завантажити фото. Спробуйте ще раз.");
        return;
      }

      onUploaded(uploaded.secure_url);
    } catch {
      setError("Немає з'єднання з сервісом фото.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-accent-border bg-accent-soft">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element -- Cloudinary URL, not an optimizable local asset
          <img src={preview} alt={name} className="h-full w-full object-cover" />
        ) : (
          <span className="font-display text-xl text-accent">{initials(name)}</span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-fit rounded-full border border-border-strong px-4 py-1.5 text-sm text-fg-muted transition-colors hover:text-fg disabled:opacity-50"
        >
          {uploading ? "Завантаження…" : "Змінити фото"}
        </button>
        {error ? <p className="text-xs text-red-400">{error}</p> : null}
      </div>
    </div>
  );
}
