import { Card, PageHeader } from "@/components/ui";
import { CsvImport } from "@/features/athletes/csv-import";
export default function Page() {
  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Importação segura"
        title="Importar atletas"
        description="Preview, validação e detecção de duplicidades antes de qualquer escrita."
      />
      <Card>
        <CsvImport />
      </Card>
    </div>
  );
}
