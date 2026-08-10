import { redirect } from "next/navigation";

export default function LegacyAdminMirrorPage() {
  redirect("/admin/preview");
}
