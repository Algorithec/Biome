import { z } from "zod";

export const ProductDetailsQuerySchema = z.object({
  id: z.string().trim().min(1),
  provider: z.string().trim().min(1),
});

export type ProductDetailsQueryDto = z.infer<typeof ProductDetailsQuerySchema>;

export const CompareProductsSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().trim().min(1),
        provider: z.string().trim().min(1),
      })
    )
    .min(2)
    .max(6),
});

export type CompareProductsDto = z.infer<typeof CompareProductsSchema>;

export const AlternativesQuerySchema = z.object({
  id: z.string().trim().min(1),
  provider: z.string().trim().min(1),
});

export type AlternativesQueryDto = z.infer<typeof AlternativesQuerySchema>;

