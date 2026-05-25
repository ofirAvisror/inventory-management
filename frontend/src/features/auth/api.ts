import { api } from "../../lib/api";

export async function resendVerificationEmail(email: string): Promise<string> {
  const { data } = await api.post<{ message: string }>(
    "/api/auth/resend-verification",
    { email },
  );
  return data.message;
}
