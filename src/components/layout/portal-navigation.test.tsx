import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PortalNavigation, type PortalNavItem } from "./portal-navigation";

let pathname = "/admin";

vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
}));

const items: PortalNavItem[] = [
  {
    key: "command",
    label: "Visão geral",
    href: "/admin",
    group: "Comando",
    icon: "dashboard",
  },
  {
    key: "teams",
    label: "Equipes",
    href: "/admin/equipes",
    group: "Esportivo",
    icon: "teams",
  },
];

describe("PortalNavigation", () => {
  beforeEach(() => {
    pathname = "/admin";
  });

  it("marks the current route with aria-current", () => {
    pathname = "/admin/equipes";
    render(<PortalNavigation items={items} />);
    expect(screen.getByRole("link", { name: /Equipes/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("renders grouped navigation links", () => {
    render(<PortalNavigation items={items} />);
    expect(screen.getByText("Comando")).toBeInTheDocument();
    expect(screen.getByText("Esportivo")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Visão geral/ })).toHaveAttribute(
      "href",
      "/admin",
    );
  });
});
