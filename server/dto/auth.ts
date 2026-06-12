import { z } from "zod";

export const EmailLoginSchema = z.object({
  email: z.string().email(),
  name: z.string().trim().min(1).optional(),
});

export type EmailLoginDto = z.infer<typeof EmailLoginSchema>;
