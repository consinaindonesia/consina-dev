import { createFileRoute } from "@tanstack/react-router";
import { InquiryPage } from "@/pages/InquiryPage";

export const Route = createFileRoute("/$lang/permintaan/")({
  component: InquiryPage,
});