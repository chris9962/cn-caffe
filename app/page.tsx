import { redirect } from "next/navigation";

// This page only redirects, so instant validation in dev has nothing to render and reports an error.
export const instant = false;

export default function Home() {
  redirect("/check-in");
}
