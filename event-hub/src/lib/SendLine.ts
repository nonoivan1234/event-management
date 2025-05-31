export default async function sendLine(
  LindID: string,
  title: string,
  cover: string,
  data: Record<string, string>, // 將 date、location 改為 data 物件
  link: string
) {
  const response = await fetch(
    'https://ulannnnbfftsuttmzpea.supabase.co/functions/v1/send-linebot',
    {
      method: 'POST',
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      },
      body: JSON.stringify({
        to: LindID,
        title: title,
        cover: cover ? cover : "none",
        data: data,          // 直接把整個 data 物件傳過去
        link: link,
        useFlex: true        // 使用 Flex Message
      })
    }
  );

  const resJson = await response.json();
  if (resJson.success) {
    return true;
  } else {
    console.error("Error sending Line message:", resJson);
    return false;
  }
}
