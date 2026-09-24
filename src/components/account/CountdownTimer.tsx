"use client";

import { useEffect, useState } from "react";

function pluralizeUk(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) return few;
  return many;
}

export function CountdownTimer({ targetIso }: { targetIso: string }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const diff = new Date(targetIso).getTime() - now;
  if (diff <= 0) return <span>Вже скоро</span>;

  const totalMinutes = Math.floor(diff / 60_000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days} ${pluralizeUk(days, "день", "дні", "днів")}`);
  if (days > 0 || hours > 0) parts.push(`${hours} ${pluralizeUk(hours, "годину", "години", "годин")}`);
  if (days === 0) parts.push(`${minutes} ${pluralizeUk(minutes, "хвилину", "хвилини", "хвилин")}`);

  return <span>До візиту {parts.join(" ")}</span>;
}
