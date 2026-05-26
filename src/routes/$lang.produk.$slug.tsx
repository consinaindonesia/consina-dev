import { createFileRoute } from "@tanstack/react-router";
import { ProductDetailPage } from "@/pages/ProductDetail";

export const Route = createFileRoute("/$lang/produk/$slug")({
  component: RouteComponent,
});

function RouteComponent() {
  const { slug } = Route.useParams();
  return <ProductDetailPage slug={slug} />;
}