import { Link } from "@tanstack/react-router";
import type { ComponentProps, ReactNode } from "react";
import { useLang } from "@/i18n/LangProvider";
import { localizedPath, type PageKey } from "@/i18n/routes";

type AnchorProps = Omit<ComponentProps<"a">, "href" | "children">;

export interface LocaleLinkProps extends AnchorProps {
  page: PageKey;
  slug?: string;
  children: ReactNode;
}

/**
 * Internal link that auto-prefixes the current language and resolves the
 * translated slug for the given page key.
 */
export function LocaleLink({ page, slug, children, ...rest }: LocaleLinkProps) {
  const lang = useLang();
  const to = localizedPath(page, lang, slug ? { slug } : undefined);
  // Use TanStack Link with a literal path string. We bypass the route-tree
  // type by casting to a generic anchor wrapper; the splat dispatcher resolves it.
  return (
    // @ts-expect-error: dynamic `to` is intentional for the localized dispatcher
    <Link to={to} {...rest}>
      {children}
    </Link>
  );
}
