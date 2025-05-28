export default async function sendEmail(toEmail:string, subject:string, html:string) {
    const response = await fetch("https://ulannnnbfftsuttmzpea.supabase.co/functions/v1/send-invite", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer "+ process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        },
        body: JSON.stringify({
            toEmail,
            subject,
            html
        })
    });

    const resJson = await response.json();
    if (resJson.success) 
        return true;
    else {
        console.error("Error sending email:", resJson);
        return false;
    }
}