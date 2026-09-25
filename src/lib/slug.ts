const UK_TRANSLIT: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "h", ґ: "g", д: "d", е: "e", є: "ie", ж: "zh", з: "z",
  и: "y", і: "i", ї: "i", й: "i", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p",
  р: "r", с: "s", т: "t", у: "u", ф: "f", х: "kh", ц: "ts", ч: "ch", ш: "sh", щ: "shch",
  ь: "", ю: "iu", я: "ia", "'": "", "’": "",
};

export function slugify(name: string): string {
  const transliterated = name
    .toLowerCase()
    .split("")
    .map((ch) => UK_TRANSLIT[ch] ?? ch)
    .join("");
  return transliterated.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}

/** Appends "-2", "-3", … until `exists` says the candidate is free. `exists`
 * should exclude the entity being updated (so renaming a record back to a
 * slug derived from its own current name doesn't collide with itself). */
export async function ensureUniqueSlug(base: string, exists: (slug: string) => Promise<boolean>): Promise<string> {
  const root = base || "item";
  let slug = root;
  let suffix = 2;
  while (await exists(slug)) {
    slug = `${root}-${suffix}`;
    suffix++;
  }
  return slug;
}
