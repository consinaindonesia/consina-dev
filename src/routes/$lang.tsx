import { createFileRoute, Outlet, notFound } from "@tanstack/react-router";
import { LangProvider } from "@/i18n/LangProvider";
import type { Lang } from "@/i18n";

export const Route = createFileRoute("/$lang")({
  beforeLoad: ({ params }) => {
    if (params.lang !== "id" && params.lang !== "en") {
      throw notFound();
    }
  },
  component: LangLayout,
});

function LangLayout() {
  const { lang } = Route.useParams();
  return (
    <LangProvider lang={lang as Lang}>
      <Outlet />
    </LangProvider>
  );
}
