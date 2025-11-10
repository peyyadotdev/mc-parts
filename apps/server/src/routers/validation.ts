import { z } from "zod";
import { validateVariantAttributes } from "../lib/validation";
import { publicProcedure, router } from "../lib/trpc";

export const validationRouter = router({
	validateVariant: publicProcedure
		.input(
			z.object({
				variantId: z.string().uuid(),
				templateId: z.string().uuid().optional(),
			}),
		)
		.query(async ({ input }) => {
			return await validateVariantAttributes(input.variantId, input.templateId);
		}),
});
