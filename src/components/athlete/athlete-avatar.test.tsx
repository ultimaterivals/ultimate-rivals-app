import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AthleteAvatar } from "./athlete-avatar";

describe("AthleteAvatar", () => {
  it("uses UR initials fallback instead of stock imagery", () => {
    render(<AthleteAvatar publicName="Maria Silva" />);
    expect(screen.getByText("MS")).toBeInTheDocument();
    expect(screen.getByText("UR")).toBeInTheDocument();
  });

  it("renders a provided normalized photo without exposing storage path text", () => {
    const { container } = render(
      <AthleteAvatar
        publicName="Atleta UR"
        imageUrl="https://example.invalid/signed-avatar"
      />,
    );
    expect(container.querySelector("img")).toHaveAttribute(
      "src",
      "https://example.invalid/signed-avatar",
    );
    expect(screen.queryByText(/athlete-avatars/)).not.toBeInTheDocument();
  });
});
