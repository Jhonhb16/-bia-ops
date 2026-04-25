export async function sendTelegramMessage(
  message: string,
  chatId = process.env.TELEGRAM_EXPERT_CHAT_ID
): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !chatId) {
    console.log(`[telegram-demo] ${message}`);
    return;
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: "HTML",
      disable_web_page_preview: true
    })
  });

  if (!response.ok) {
    console.error(`[telegram] Error ${response.status}`);
  }
}
