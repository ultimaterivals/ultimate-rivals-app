import {
  CalendarDays,
  Coins,
  Eye,
  Image,
  MapPin,
  Medal,
  Package,
  Sparkles,
  Target,
  Trophy,
  UserRound,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { Card, PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";

type StudioAction = {
  href: string;
  label: string;
  description: string;
  icon: typeof Trophy;
};

const actions: StudioAction[] = [
  {
    href: "/admin/athletes",
    label: "Atletas",
    description: "Perfil, nível, vínculos, status e identidade.",
    icon: UserRound,
  },
  {
    href: "/admin/venues",
    label: "Arenas",
    description: "Cadastre e mantenha as arenas que fazem parte do universo UR.",
    icon: MapPin,
  },
  {
    href: "/admin/media",
    label: "Fotos e mídia",
    description: "Organize destaques, fotos e ativos publicados pela operação.",
    icon: Image,
  },
  {
    href: "/admin/rankings",
    label: "Ranking",
    description: "Acompanhe a classificação publicada sem editar o motor de pontos.",
    icon: Trophy,
  },
  {
    href: "/admin/market",
    label: "UR Market",
    description: "Produtos, ofertas e resgates conectados à experiência do atleta.",
    icon: Package,
  },
  {
    href: "/admin/seasons",
    label: "Temporada",
    description: "Fases, calendário e estado da campanha principal.",
    icon: Medal,
  },
  {
    href: "/admin/calendar",
    label: "Agenda",
    description: "Eventos, sessões, datas e próximos pontos de contato.",
    icon: CalendarDays,
  },
  {
    href: "/admin/teams",
    label: "Equipes",
    description: "Elencos, vínculos e identidade competitiva.",
    icon: UsersRound,
  },
  {
    href: "/admin/prizes",
    label: "Recompensas",
    description: "Premiações e reconhecimentos já previstos pela operação.",
    icon: Sparkles,
  },
  {
    href: "/admin/ranking-engine",
    label: "Pontos",
    description: "Acesso controlado ao motor existente e às transações auditáveis.",
    icon: Target,
  },
  {
    href: "/admin/market",
    label: "UR Coins",
    description: "Economia interna separada do ranking e ligada ao Market.",
    icon: Coins,
  },
];

export default async function AdminStudioPage() {
  await requireRole("admin");

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Ultimate Rivals · Game Master"
        title="UR Studio"
        description="Ambiente de publicação e atualização rápida do ecossistema. Edite no Controle, confira a experiência final e mantenha o atleta imerso na temporada."
      />

      <section className="grid gap-4 lg:grid-cols-[1.25fr_.75fr]">
        <Card className="border-ur-gold/40">
          <p className="text-ur-gold text-xs font-black tracking-[.2em] uppercase">
            Atualização rápida
          </p>
          <h2 className="font-display mt-2 text-3xl font-black uppercase">
            Movimente o mundo UR
          </h2>
          <p className="mt-3 max-w-2xl text-zinc-400">
            Use os atalhos abaixo para atualizar as entidades oficiais. O Studio não cria engines paralelas nem altera regras esportivas: ele concentra os pontos de operação que alimentam o aplicativo.
          </p>
        </Card>

        <Card className="border-ur-gold/40">
          <Eye className="text-ur-gold" size={28} />
          <h2 className="mt-3 text-xl font-black">Prévia do atleta</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Abra o ambiente de prévia para validar como as mudanças aparecem na experiência final sem trocar a sessão administrativa.
          </p>
          <Link
            href="/admin/mirror"
            className="bg-ur-gold text-ur-black rounded-ur mt-5 inline-flex min-h-11 items-center gap-2 px-4 font-black"
          >
            <Eye size={17} /> Abrir prévia
          </Link>
        </Card>
      </section>

      <section>
        <div className="mb-4">
          <p className="text-xs font-black tracking-[.18em] text-zinc-500 uppercase">
            Módulos do ecossistema
          </p>
          <h2 className="font-display text-2xl font-black uppercase">
            Editar e publicar
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {actions.map(({ href, label, description, icon: Icon }, index) => (
            <Link key={`${href}-${index}`} href={href}>
              <Card className="hover:border-ur-gold/40 h-full transition-colors">
                <Icon className="text-ur-gold" size={24} />
                <h3 className="mt-4 text-xl font-black">{label}</h3>
                <p className="mt-2 text-sm text-zinc-400">{description}</p>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <Card>
        <p className="text-xs font-black tracking-[.18em] text-zinc-500 uppercase">
          Regra de operação
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          {[
            ["1", "Atualizar", "Edite a entidade oficial."],
            ["2", "Publicar", "Use apenas dados válidos e homologados."],
            ["3", "Pré-visualizar", "Confira a experiência do atleta."],
            ["4", "Validar", "Corrija antes de seguir a operação."],
          ].map(([step, title, detail]) => (
            <div key={step} className="rounded-ur border p-4">
              <strong className="text-ur-gold font-display text-3xl">{step}</strong>
              <p className="mt-2 font-black">{title}</p>
              <p className="mt-1 text-sm text-zinc-500">{detail}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
