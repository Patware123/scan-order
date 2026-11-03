import { z } from "zod";

export const createInvitationSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
  role: z.enum(["OWNER", "MANAGER", "KITCHEN"]),
});

export const acceptInvitationSchema = z.object({
  token: z.string().min(10, "Invalid invitation token"),
});

export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;
export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;
