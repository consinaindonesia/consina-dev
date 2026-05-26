import { createFileRoute } from "@tanstack/react-router";
import { HomePage } from "@/pages/Home";
import { buildHead } from "@/lib/locale-head";
import type { Lang } from "@/i18n";

export const Route = createFileRoute("/$lang/")({
  head: ({ params }) => buildHead("home", params.lang as Lang),
  component: HomePage,
});
