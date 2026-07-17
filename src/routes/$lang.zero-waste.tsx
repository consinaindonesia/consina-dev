import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, Camera, Gift, Leaf, Upload } from "lucide-react";

import { Footer } from "@/components/site/Footer";
import { Nav } from "@/components/site/Nav";

export const Route = createFileRoute("/$lang/zero-waste")({
  head: ({ params }) => {
    const isEn = params.lang === "en";
    const title = isEn ? "Zero Waste Claim - Consina" : "Klaim Zero Waste - Consina";
    const description = isEn
      ? "Upload proof that you carried trash back or cleaned a trail to claim Consina rewards."
      : "Unggah bukti membawa turun sampah atau membersihkan jalur untuk klaim apresiasi Consina.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  component: ZeroWastePage,
});

const proofRows = [
  {
    id: "ZW-001",
    activity: "Rinjani Clean Trail",
    location: "Rinjani, NTB",
    name: "Dewi A.",
    photos: 4,
    statusId: "Menunggu verifikasi",
    statusEn: "Pending review",
    rewardId: "Diskon 15%",
    rewardEn: "15% discount",
  },
  {
    id: "ZW-002",
    activity: "Semeru Trash Carry",
    location: "Semeru, Jawa Timur",
    name: "Raka P.",
    photos: 6,
    statusId: "Disetujui",
    statusEn: "Approved",
    rewardId: "Kaos Consina",
    rewardEn: "Consina shirt",
  },
  {
    id: "ZW-003",
    activity: "Prau Basecamp Cleanup",
    location: "Prau, Jawa Tengah",
    name: "Nadia S.",
    photos: 3,
    statusId: "Butuh review",
    statusEn: "Needs review",
    rewardId: "Diskon 10%",
    rewardEn: "10% discount",
  },
];

function ZeroWastePage() {
  const { lang } = Route.useParams();
  const isEn = lang === "en";
  const homeHref = `/${lang}`;
  const copy = isEn
    ? {
        back: "Back to home",
        badge: "Sustainable Outdoor | I'm Zero Waste",
        title: "Show your trail cleanup proof. Claim Consina rewards.",
        body:
          "Upload photos that show you carried trash back from the mountain or joined a cleanup activity. The Consina team can review the proof and grant a discount or a free shirt reward.",
        upload: "Upload proof",
        guide: "Reward guide",
        tableTitle: "Zero Waste Proof Table",
        tableBody: "This table is prepared for public proof review. Later, submissions can be connected to admin approval and reward issuance.",
        columns: ["ID", "Activity", "Location", "Submitted by", "Photos", "Status", "Reward"],
      }
    : {
        back: "Kembali ke beranda",
        badge: "Sustainable Outdoor | I'm Zero Waste",
        title: "Tunjukkan bukti bersih jalur. Klaim apresiasi Consina.",
        body:
          "Unggah foto bukti membawa turun sampah dari gunung atau ikut membersihkan jalur. Tim Consina dapat meninjau bukti tersebut lalu memberi diskon atau baju gratis.",
        upload: "Unggah bukti",
        guide: "Panduan reward",
        tableTitle: "Tabel Bukti Zero Waste",
        tableBody: "Tabel ini disiapkan untuk review bukti publik. Nantinya submission bisa disambungkan ke approval admin dan pemberian reward.",
        columns: ["ID", "Aktivitas", "Lokasi", "Pengirim", "Foto", "Status", "Reward"],
      };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <main className="mx-auto max-w-[1180px] px-4 py-8 md:px-8 md:py-12">
        <a href={homeHref} className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-secondary">
          <ArrowLeft className="h-4 w-4" />
          {copy.back}
        </a>

        <section className="mt-6 overflow-hidden rounded-3xl bg-primary text-primary-foreground shadow-xl">
          <div className="relative min-h-[360px] px-6 py-10 md:px-12 md:py-14">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.18),transparent_28%),linear-gradient(120deg,rgba(22,78,59,0.98),rgba(9,45,32,0.82))]" />
            <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(135deg,rgba(255,255,255,0.18)_1px,transparent_1px)] [background-size:28px_28px]" />
            <div className="relative z-10 grid gap-10 md:grid-cols-[1.1fr_0.9fr] md:items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em]">
                  <Leaf className="h-4 w-4" />
                  {copy.badge}
                </div>
                <h1 className="mt-6 max-w-3xl text-3xl font-black leading-tight tracking-tight md:text-5xl">
                  {copy.title}
                </h1>
                <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/82 md:text-lg">
                  {copy.body}
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <a href="#proof-table" className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold uppercase tracking-wider text-primary">
                    <Upload className="h-4 w-4" />
                    {copy.upload}
                  </a>
                  <a href="#proof-table" className="inline-flex items-center gap-2 rounded-full border border-white/35 px-5 py-3 text-sm font-bold uppercase tracking-wider text-white">
                    <Gift className="h-4 w-4" />
                    {copy.guide}
                  </a>
                </div>
              </div>
              <div className="rounded-3xl border border-white/20 bg-white/10 p-5 backdrop-blur">
                <div className="aspect-[4/3] rounded-2xl border border-dashed border-white/35 bg-black/15 p-6">
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <Camera className="h-12 w-12 text-white/85" />
                    <p className="mt-4 text-sm font-semibold text-white/85">
                      {isEn ? "Logo and proof gallery can be connected from admin later." : "Logo dan galeri bukti bisa disambungkan dari admin nanti."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="proof-table" className="mt-8 rounded-3xl border border-border bg-card p-4 shadow-sm md:p-6">
          <div className="mb-5">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-secondary">Zero Waste</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-primary md:text-3xl">{copy.tableTitle}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{copy.tableBody}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-y border-border bg-muted/60 text-xs uppercase tracking-wider text-muted-foreground">
                  {copy.columns.map((column) => (
                    <th key={column} className="px-4 py-3 font-bold">{column}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {proofRows.map((row) => (
                  <tr key={row.id} className="border-b border-border">
                    <td className="px-4 py-4 font-bold text-primary">{row.id}</td>
                    <td className="px-4 py-4">{row.activity}</td>
                    <td className="px-4 py-4">{row.location}</td>
                    <td className="px-4 py-4">{row.name}</td>
                    <td className="px-4 py-4">{row.photos}</td>
                    <td className="px-4 py-4">{isEn ? row.statusEn : row.statusId}</td>
                    <td className="px-4 py-4 font-semibold">{isEn ? row.rewardEn : row.rewardId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
