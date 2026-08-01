"use client";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui";
import {
  parseAthleteCsv,
  type ImportPreviewRow,
} from "@/server/services/athlete-import.service";
import { importAthletesAction, type AthleteActionState } from "./actions";
export function CsvImport() {
  const [rows, setRows] = useState<ImportPreviewRow[]>([]);
  const [state, action, pending] = useActionState(importAthletesAction, {
    status: "idle",
  } as AthleteActionState);
  const payload = rows.map((r) => ({
    publicName: r.raw.public_name,
    fullName: r.raw.full_name,
    birthDate: r.raw.birth_date || null,
    gender: r.raw.gender,
    emailContact: r.raw.email_contact || null,
    phone: r.raw.phone || null,
    city: r.raw.city || null,
    state: r.raw.state || null,
  }));
  return (
    <div className="grid gap-5">
      <a
        download="ultimate-rivals-athletes.csv"
        href="data:text/csv;charset=utf-8,public_name%2Cfull_name%2Cbirth_date%2Cgender%2Cemail_contact%2Cphone%2Ccity%2Cstate%0ATest%20Athlete%2CFictitious%20Athlete%2C2000-01-01%2Cundisclosed%2Ctest%40example.invalid%2C%2CBetim%2CMG"
        className="text-ur-gold"
      >
        Baixar template CSV
      </a>
      <input
        type="file"
        accept=".csv,text/csv"
        aria-label="Arquivo CSV"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file) setRows(parseAthleteCsv(await file.text()));
        }}
      />
      <p>
        {rows.length
          ? `${rows.filter((r) => r.valid && !r.duplicate).length} válidas · ${rows.filter((r) => !r.valid).length} inválidas · ${rows.filter((r) => r.duplicate).length} duplicatas`
          : "Selecione um arquivo para validar localmente antes da confirmação."}
      </p>
      {rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th>Linha</th>
                <th>Nome</th>
                <th>Resultado</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.line} className="border-t">
                  <td className="p-3">{r.line}</td>
                  <td>{r.raw.public_name}</td>
                  <td>
                    {r.duplicate
                      ? "Possível duplicata"
                      : r.valid
                        ? "Válida"
                        : r.errors.join("; ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <form action={action}>
        <input type="hidden" name="rows" value={JSON.stringify(payload)} />
        <Button
          type="submit"
          disabled={
            pending || !rows.length || rows.some((r) => !r.valid || r.duplicate)
          }
        >
          {pending ? "Importando…" : "Confirmar lote validado"}
        </Button>
      </form>
      {state.message && (
        <p role="status" className="text-ur-gold">
          {state.message}
        </p>
      )}
      <p className="text-xs text-zinc-500">
        A confirmação permanece bloqueada para lotes mistos; nenhuma inserção
        parcial é realizada.
      </p>
    </div>
  );
}
