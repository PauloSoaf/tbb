import { Resend } from "resend";

if (!process.env.RESEND_API_KEY) {
  console.warn("RESEND_API_KEY is not defined in the environment variables. Emails will not be sent.");
}

export const resend = new Resend(process.env.RESEND_API_KEY || "re_dummy_key");
