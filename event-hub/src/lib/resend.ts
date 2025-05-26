import { Resend } from 'resend';

const resend = new Resend(process.env.NEXT_PUBLIC_RESEND_API_KEY);

export async function send_email(toEmail, subject, html_body) {
  const { data, error } = await resend.emails.send({
    from: 'Event Hub <onboarding@resend.dev>', to: toEmail,
    subject: subject, html: html_body,});

  if (error) {
    console.error('❌ 發信失敗:', error);
    return false;
  }

  return true;
}

export default send_email;