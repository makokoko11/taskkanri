import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
  const { pdf, to, subject } = await req.json();

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = Number(process.env.SMTP_PORT) || 587;

  if (!host || !user || !pass) {
    return NextResponse.json({ error: "SMTP not configured" }, { status: 503 });
  }
  if (!to) {
    return NextResponse.json({ error: "No recipient" }, { status: 400 });
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from: user,
    to,
    subject: subject ?? "カレンダー",
    text: "カレンダーPDFを添付します。",
    attachments: [
      {
        filename: "calendar.pdf",
        content: Buffer.from(pdf, "base64"),
        contentType: "application/pdf",
      },
    ],
  });

  return NextResponse.json({ ok: true });
}
