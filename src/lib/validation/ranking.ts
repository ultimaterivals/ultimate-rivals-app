import { z } from "zod";

export const processHomologatedMatchSchema = z.object({
  matchId: z.string().uuid(),
  operationId: z.string().uuid(),
});

export type ProcessHomologatedMatchInput = z.infer<
  typeof processHomologatedMatchSchema
>;
