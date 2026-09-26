import { cn } from "@/lib/utils";

export function SectionHeading({
  title,
  description,
  align = "left",
  onCream = false,
  className,
}: {
  title: string;
  description?: string;
  align?: "left" | "center";
  /** Cream sections need dark-on-light text, not the site's default light-on-dark. */
  onCream?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4",
        align === "center" && "items-center text-center",
        className,
      )}
    >
      <h2
        className={cn(
          "font-display text-3xl leading-tight text-balance sm:text-4xl lg:text-5xl",
          onCream ? "text-on-cream" : "text-fg",
        )}
      >
        {title}
      </h2>
      {description ? (
        <p
          className={cn(
            "max-w-xl text-base leading-relaxed",
            onCream ? "text-on-cream-muted" : "text-fg-muted",
            align === "center" && "mx-auto",
          )}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}
