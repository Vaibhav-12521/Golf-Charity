import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
const from = process.env.EMAIL_FROM || "Birdie & Cause <onboarding@resend.dev>";

const client = apiKey ? new Resend(apiKey) : null;

export async function sendEmail(opts: { to: string; subject: string; html: string }) {
  if (!client) {
    // Email is optional — silent no-op when not configured so flows still work.
    console.log("[email:skipped]", opts.subject, "->", opts.to);
    return { skipped: true };
  }
  try {
    const res = await client.emails.send({ from, ...opts });
    return res;
  } catch (e) {
    console.error("[email:error]", e);
    return { error: e };
  }
}

export const emails = {
  welcome: (to: string, name: string) =>
    sendEmail({
      to,
      subject: "Welcome to Birdie & Cause",
      html: `<p>Hi ${name || "there"},</p>
             <p>Welcome to <strong>Birdie & Cause</strong>. Pick a charity, enter your last 5 scores,
             and you're entered into this month's draw.</p>
             <p>Play a round. Change a life.</p>`,
    }),
  drawPublished: (to: string, name: string, monthLabel: string) =>
    sendEmail({
      to,
      subject: `${monthLabel} draw results are in`,
      html: `<p>Hi ${name || "there"},</p>
             <p>The <strong>${monthLabel}</strong> draw has been published. Check your dashboard to see how you did.</p>`,
    }),
  winnerNotice: (to: string, name: string, prize: string) =>
    sendEmail({
      to,
      subject: `Congratulations — you won ${prize}!`,
      html: `<p>Hi ${name || "there"},</p>
             <p>You're a winner in this month's draw — prize: <strong>${prize}</strong>.</p>
             <p>Upload your score-card proof from the dashboard to claim your payout.</p>`,
    }),
};
