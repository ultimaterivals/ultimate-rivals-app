import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BrandMark } from "@/components/layout/brand-mark";
import { Card, PageHeader } from "@/components/ui";
const links = [
  ["individual", "Individual"],
  ["teams", "Equipes"],
  ["poles", "Polos"],
  ["doubles", "Duplas"],
  ["fours", "Quartetos"],
];
export default function PublicRankingsPage() {
  return (
    <main className="mx-auto min-h-dvh max-w-7xl px-5 py-6 sm:px-8">
      <header className="mb-14 flex items-center justify-between">
        <BrandMark />
        <Link href="/login" className="font-bold">
          Entrar
        </Link>
      </header>
      <PageHeader
        eyebrow="Ultimate Rivals"
        title="Rankings oficiais"
        description="Classificações esportivas públicas derivadas exclusivamente de resultados homologados."
      />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {links.map(([slug, label]) => (
          <Link key={slug} href={`/rankings/${slug}`}>
            <Card className="hover:border-ur-gold/60">
              <strong className="text-2xl">{label}</strong>
              <ArrowRight className="text-ur-gold mt-6" />
            </Card>
          </Link>
        ))}
      </div>
    </main>
  );
}
