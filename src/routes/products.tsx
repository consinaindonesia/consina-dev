import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/products")({
  component: ProductIndexRedirect,
});

function ProductIndexRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    void navigate({ to: "/catalog", replace: true });
  }, [navigate]);
  return null;
}
