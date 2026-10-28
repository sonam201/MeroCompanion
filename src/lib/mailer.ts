import nodemailer from "nodemailer";

// Sends via the project owner's own Gmail account (SMTP + an App Password),
// not a third-party transactional email API. Gmail already has deliverability
// trust for mail sent from a real Gmail account, so this works for any
// recipient with zero domain-verification setup - unlike Resend's free
// sandbox sender, which can only email the Resend account's own address.
let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
  }
  return transporter;
}

export async function sendMail({
  to,
  subject,
  text,
}: {
  to: string;
  subject: string;
  text: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await getTransporter().sendMail({
      from: process.env.GMAIL_USER,
      to,
      subject,
      text,
    });
    return { ok: true };
  } catch (err) {
    console.error("sendMail failed:", err);
    return { ok: false, error: err instanceof Error ? err.message : "unknown error" };
  }
}
