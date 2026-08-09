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

type StudioGroup = {
  label: string;
  description: string;
  actions: StudioAction[];
};

const groups: StudioGroup[] = [
  {
    label: "Mundo do atleta",
    description: "As superfícies que dão identidade, contexto e narrativa à experiência.",
    actions: [
      {
        href: "/admin/athletes",
        label: "Atletas",
        description: "Perfil, nível, vínculos, status e identidade.",
        icon: UserRound,
      },
      {
        href: "/admin/venues",
        label: "Arenas",
        description: "Arenas, quadras, polos, parcerias e estrutura operacional.",
        icon: MapPin,
      },
      {
        href: "/admin/media",
        label: "Fotos e destaques",
        description: "Mídia, clipes e ativos que podem alimentar a narrativa publicada.",
        icon: Image,
      },
      {
        href: "/admin/teams",
        label: "Equipes",
        description: "Elencos, vínculos e identidade competitiva.",
        icon: UsersRound,
      },
    ],
  },
  {
    label: "Progressão",
    description: "Tudo que responde ao atleta: onde estou, o que faço agora e até onde posso chegar.",
    actions: [
      {
        href: "/admin/rankings",
        label: "Ranking",
        description: "Acompanhe a classificação publicada sem editar o motor de pontos.",
        icon: Trophy,
      },
      {
        href: "/admin/assessments",
        label: "Missões e desenvolvimento",
        description: "Avaliações, feedbacks e dados que alimentam a evolução esportiva.",
        icon: Target,
      },
      {
        href: "/admin/leveling",
        label: "Níveis",
        description: "Nivelamento e progressão homologada pela operação técnica.",
        icon: Medal,
      },
      {
        href: "/admin/prizes",
        label: "Reconhecimentos",
        description: "Premiações e reconhecimentos já previstos pela operação.",
        icon: Sparkles,
      },
    ],
  },
  {
    label: "Temporada viva",
    description: "Os controles que movimentam o calendário e a campanha contínua.",
    actions: [
      {
        href: "/admin/seasons",
        label: "Temporada",
        description: "Fases, estado e estrutura da campanha principal.",
        icon: Medal,
      },
      {
        href: "/admin/calendar",
        label: "Agenda",
        description: "Eventos, sessões, datas e próximos pontos de contato.",
        icon: CalendarDays,
      },
      {
        href: "/admin/ranking-engine",
        label: "Transações de pontos",
        description: "Acesso auditável ao motor existente, sem regra paralela.",
        icon: Trophy,
      },
    ],
  },
  {
    label: "Economia UR",
    description: "Recompensa e utilidade permanecem separadas da classificação competitiva.",
    actions: [
      {
        href: "/admin/market",
        label: "UR Market",
        description: "Produtos, ofertas e resgates conectados à experiência do atleta.",
        icon: Package,
      },
      {
        href: "/admin/market",
        label: "UR Coins",
        description: "Economia interna ligada ao Market e separada dos pontos de ranking.",
        icon: Coins,
      },
    ],
  },
];

const quickActions = [
  ["Atualizar atleta", "/admin/athletes"],
  ["Atualizar arena", "/admin/venues"],
  ["Publicar mídia", "/admin/media"],
  ["Abrir Market", "/admin/market"],
  ["Mover temporada", "/admin/seasons"],
  ["Atualizar agenda", "/admin/calendar"],
] as const;

export default async function AdminStudioPage() {
  await requireRole("admin");

  return (
    <div className="mx-auto grid max-w-7xl gap-8">
      <PageHeader
        eyebrow="Ultimate Rivals · Game Master"
        title="UR Studio"
        description="Ambiente de publicação e atualização rápida do ecossistema. O objetivo é reduzir a distância entre uma decisão operacional e o que o atleta enxerga no aplicativo."
      />

      <section className="grid gap-4 lg:grid-cols-[1.25fr_.75fr]">
        <Card className="border-ur-gold/40 ranking-hero">
          <p className="text-ur-gold text-xs font-black tracking-[.2em] uppercase">
            Atualização rápida
          </p>
          <h2 className="font-display mt-2 text-3xl font-black uppercase sm:text-4xl">
            Movimente o mundo UR
          </h2>
          <p className="mt-3 max-w-2xl text-zinc-400">
            O Studio concentra os pontos de operação que alimentam Player Hub, Arenas, Destaques, Missões, Ranking, temporada e economia. Ele não cria engines paralelas nem altera regras esportivas.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {quickActions.map(([label, href]) => (
              <Link
                key={label}
                href={href}
                className="rounded-ur border border-white/10 bg-black/20 px-4 py-3 text-sm font-black transition-colors hover:border-ur-gold/40 hover:text-ur-gold"
              >
                {label}
              </Link>
            ))}
          </div>
        </Card>

        <Card className="border-ur-gold/40">
          <Eye className="text-ur-gold" size={28} />
          <h2 className="mt-3 text-xl font-black">Prévia do atleta</h2>
          <p className="mt-2 text-sm text-zinc-400">
            A prévia segura pertence ao Control Center e será integrada sem trocar a sessão administrativa ou duplicar a UI do atleta. Esta branch não cria uma rota insegura de impersonação.
          </p>
          <Link
            href="/admin/athletes"
            className="mt-5 inline-flex min-h-11 items-center gap-2 font-black text-ur-gold"
          >
            <UserRound size={17} /> Abrir atletas
          </Link>
        </Card>
      </section>

      <Card>
        <p className="text-xs font-black tracking-[.18em] text-zinc-500 uppercase">
          Fluxo operacional
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          {[
            ["1", "Identificar", "Encontre a entidade que precisa mudar."],
            ["2", "Atualizar", "Edite a fonte oficial do dado."],
            ["3", "Publicar", "Libere somente conteúdo válido e homologado."],
            ["4", "Validar", "Confira o efeito final antes de seguir."],
          ].map(([step, title, detail]) => (
            <div key={step} className="rounded-ur border border-white/10 p-4">
              <strong className="text-ur-gold font-display text-3xl">{step}</strong>
              <p className="mt-2 font-black">{title}</p>
              <p className="mt-1 text-sm text-zinc-500">{detail}</p>
            </div>
          ))}
        </div>
      </Card>

      {groups.map((group) => (
        <section key={group.label}>
          <div className="mb-4">
            <p className="text-xs font-black tracking-[.18em] text-zinc-500 uppercase">
              UR Studio
            </p>
            <h2 className="font-display text-2xl font-black uppercase">
              {group.label}
            </h2>
            <p className="mt-1 max-w-3xl text-sm text-zinc-500">
              {group.description}
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {group.actions.map(({ href, label, description, icon: Icon }, index) => (
              <Link key={`${href}-${label}-${index}`} href={href}>
                <Card className="hover:border-ur-gold/40 h-full transition-colors">
                  <Icon className="text-ur-gold" size={24} />
                  <h3 className="mt-4 text-xl font-black">{label}</h3>
                  <p className="mt-2 text-sm text-zinc-400">{description}</p>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      ))}

      <Card className="border-ur-gold/20">
        <p className="text-xs font-black tracking-[.18em] text-zinc-500 uppercase">
          Princípio do Studio
        </p>
        <p className="mt-3 max-w-4xl text-lg font-bold text-zinc-300">
          Uma alteração deve nascer na fonte oficial, refletir no aplicativo e ser verificável. O Studio encurta esse caminho; não substitui a verdade operacional do sistema.
        </p>
      </Card>
    </div>
  );
}
