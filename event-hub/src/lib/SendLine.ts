export default async function sendLine(LindID: string, title:string, cover:string, date: string, location: string, link: string) {
    const response = await fetch('https://ulannnnbfftsuttmzpea.supabase.co/functions/v1/send-linebot', {
        method: 'POST',
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer "+ process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        },
        body: JSON.stringify({
            to: LindID,
            title: title,
            cover: cover? cover: "none",
            date: date? date : 'Coming Soon',
            location: location? location : 'TBD',
            link: link,
            useFlex: true // ✅ 選擇是否使用 Flex Message
        })
    })

    const resJson = await response.json();
    if (resJson.success) 
        return true;
    else {
        console.error("Error sending Line message:", resJson);
        return false;
    }
}