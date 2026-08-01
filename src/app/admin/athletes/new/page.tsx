import { PageHeader } from "@/components/ui";
import { AthleteCreate360Form } from "@/features/athletes/athlete-forms";
export default function Page() {
  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Atleta 360"
        title="Cadastrar atleta"
        description="O cadastro pode ser criado sem conta e associado posteriormente."
      />
      <AthleteCreate360Form />
    </div>
  );
}
