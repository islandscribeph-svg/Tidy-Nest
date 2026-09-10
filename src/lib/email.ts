import { Resend } from "resend";

const FROM_ADDRESS = process.env.EMAIL_FROM || "Tidy Nest <onboarding@resend.dev>";

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("RESEND_API_KEY is not configured");
    }
    // Local/dev fallback so the flow is testable without a real API key.
    console.log(`[dev] Password reset link for ${to}: ${resetUrl}`);
    return;
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject: "Reset your Tidy Nest password",
    html: `
      <p>Someone requested a password reset for your Tidy Nest login.</p>
      <p><a href="${resetUrl}">Click here to set a new password</a>. This link expires in 1 hour.</p>
      <p>If you didn't request this, you can safely ignore this email.</p>
    `,
    text: `Reset your Tidy Nest password: ${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, you can safely ignore this email.`,
  });

  if (error) {
    throw new Error(`Failed to send password reset email: ${error.message}`);
  }
}
