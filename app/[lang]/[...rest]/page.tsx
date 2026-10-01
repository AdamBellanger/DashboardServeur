import { notFound } from "next/navigation";

// Any unknown URL lands here (proxy.ts prefixes every path with its language),
// so the 404 renders inside the localized layout.
export const dynamicParams = true;

export default function CatchAll() {
  notFound();
}
