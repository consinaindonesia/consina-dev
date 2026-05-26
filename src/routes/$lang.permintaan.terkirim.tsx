import { createFileRoute } from "@tanstack/react-router";
import { InquirySentPage } from "@/pages/InquirySentPage";

export const Route = createFileRoute("/$lang/permintaan/terkirim")({
  component: InquirySentPage,
});