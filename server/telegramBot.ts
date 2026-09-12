import { promisify } from 'util';
import fs from 'fs';

interface TelegramBotStatus {
  configured: boolean;
  username: string | null;
  firstName: string | null;
  appUrl: string;
}

let botStatus: TelegramBotStatus = {
  configured: false,
  username: null,
  firstName: null,
  appUrl: '',
};

let isPolling = false;
let lastUpdateId = 0;

export function getTelegramBotStatus(): TelegramBotStatus {
  return botStatus;
}

function resolvePublicUrl(url?: string): string {
  const base =
    url ||
    process.env.APP_URL ||
    'https://ais-pre-tu4qfeesmy7pn5oaf4zchw-667383718096.asia-southeast1.run.app';
  // If dev URL, convert to public pre URL so external mobile users don't hit 403 Google Auth
  return base.replace('ais-dev-', 'ais-pre-');
}

export async function initTelegramBot(appUrl: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || token.trim() === '') {
    console.log('[TelegramBot] TELEGRAM_BOT_TOKEN not provided, skipping bot service.');
    return;
  }

  const targetAppUrl = resolvePublicUrl(appUrl);
  botStatus.appUrl = targetAppUrl;

  try {
    console.log('[TelegramBot] Initializing bot with provided token...');
    const meRes = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const meData = await meRes.json();

    if (!meData.ok) {
      console.warn('[TelegramBot] Failed to authenticate bot:', meData.description);
      return;
    }

    const botInfo = meData.result;
    botStatus = {
      configured: true,
      username: botInfo.username || null,
      firstName: botInfo.first_name || null,
      appUrl: targetAppUrl,
    };

    console.log(`[TelegramBot] Successfully connected as @${botInfo.username} (${botInfo.first_name})`);

    // Configure chat menu button to launch Web App directly
    try {
      const menuRes = await fetch(`https://api.telegram.org/bot${token}/setChatMenuButton`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          menu_button: {
            type: 'web_app',
            text: '🎵 Unduh Lagu',
            web_app: {
              url: targetAppUrl,
            },
          },
        }),
      });
      const menuData = await menuRes.json();
      if (menuData.ok) {
        console.log('[TelegramBot] Web App Chat Menu Button registered successfully!');
      }
    } catch (menuErr) {
      console.warn('[TelegramBot] Notice while setting menu button:', menuErr);
    }

    // Configure bot commands
    try {
      await fetch(`https://api.telegram.org/bot${token}/setMyCommands`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commands: [
            { command: 'start', description: 'Buka Spotify Downloader Mini App' },
            { command: 'help', description: 'Panduan cara mengunduh lagu Spotify' },
          ],
        }),
      });
    } catch {}

    // Start background polling for bot messages
    if (!isPolling) {
      isPolling = true;
      runPollingLoop(token, targetAppUrl).catch((err) => {
        console.error('[TelegramBot] Polling loop fatal error:', err);
        isPolling = false;
      });
    }
  } catch (err) {
    console.warn('[TelegramBot] Error initializing bot:', err);
  }
}

async function runPollingLoop(token: string, webAppUrl: string) {
  console.log('[TelegramBot] Starting long polling loop...');

  while (isPolling) {
    try {
      const url = `https://api.telegram.org/bot${token}/getUpdates?offset=${lastUpdateId + 1}&timeout=25`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.ok && Array.isArray(data.result)) {
        for (const update of data.result) {
          lastUpdateId = Math.max(lastUpdateId, update.update_id);
          await handleTelegramUpdate(token, webAppUrl, update);
        }
      } else {
        // If error (e.g. rate limit), wait briefly before next poll
        await new Promise((r) => setTimeout(r, 3000));
      }
    } catch (err: any) {
      // Network disconnect / timeout is normal in long polling, wait 3 seconds and retry
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

async function handleTelegramUpdate(token: string, webAppUrl: string, update: any) {
  try {
    const message = update.message;
    if (!message || !message.text) return;

    const chatId = message.chat?.id;
    if (!chatId) return;

    const text = message.text.trim();
    const userFirstName = message.from?.first_name || 'Teman';

    // 1. Command /start
    if (text.startsWith('/start')) {
      const parts = text.split(' ');
      const startParam = parts[1];

      // If deep link with track id (e.g. /start dl_4cOdK2wGLETKBW3PvgPWqT)
      if (startParam && startParam.startsWith('dl_')) {
        const safeTrackId = startParam.substring(3).replace(/[^a-zA-Z0-9_-]/g, '');
        const filePath = `/tmp/spotify_cache/${safeTrackId}.mp3`;
        if (fs.existsSync(filePath)) {
          await sendTelegramMessage(token, chatId, {
            text: `🎵 Sedang mengirim file MP3 ke chat Anda, mohon tunggu sebentar...`,
          });
          await sendTelegramAudio(chatId, filePath, {
            title: 'Spotify Track',
            artist: 'Spotify Downloader',
          });
          return;
        }
      }

      await sendTelegramMessage(token, chatId, {
        text:
          `Halo ${userFirstName}! 👋\n\n` +
          `Selamat datang di *Spotify Downloader Bot* 🎵\n\n` +
          `Aplikasi ini memungkinkan Anda mengunduh lagu Spotify *full durasi* (320kbps HD MP3) dengan cover album dan metadata lengkap langsung di Telegram!\n\n` +
          `Tekan tombol di bawah untuk membuka aplikasi:`,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '🚀 Buka Spotify Downloader',
                web_app: { url: webAppUrl },
              },
            ],
          ],
        },
      });
      return;
    }

    // 2. Command /help
    if (text.startsWith('/help')) {
      await sendTelegramMessage(token, chatId, {
        text:
          `📖 *Panduan Penggunaan:*\n\n` +
          `1. Salin link lagu dari aplikasi Spotify (Bagikan > Salin Tautan).\n` +
          `2. Buka tombol *Buka Spotify Downloader* di bawah, atau kirimkan link Spotify langsung ke chat ini.\n` +
          `3. Tekan Unduh untuk menyimpan lagu MP3 full durasi 320kbps ke perangkat Anda.`,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '🚀 Buka Spotify Downloader',
                web_app: { url: webAppUrl },
              },
            ],
          ],
        },
      });
      return;
    }

    // 3. User sent a Spotify link
    if (text.includes('open.spotify.com/track/') || text.includes('spotify.link/')) {
      const match = text.match(/https?:\/\/[^\s]+/);
      const spotifyUrl = match ? match[0] : text;
      const launchUrl = `${webAppUrl}?track=${encodeURIComponent(spotifyUrl)}`;

      await sendTelegramMessage(token, chatId, {
        text:
          `🎵 *Tautan Spotify Terdeteksi!*\n\n` +
          `Klik tombol di bawah untuk membuka Mini App dan mengunduh lagu ini secara full durasi:`,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '⚡ Unduh Lagu Ini Sekarang',
                web_app: { url: launchUrl },
              },
            ],
            [
              {
                text: '📱 Buka Menu Utama',
                web_app: { url: webAppUrl },
              },
            ],
          ],
        },
      });
      return;
    }

    // 4. Any other text
    await sendTelegramMessage(token, chatId, {
      text:
        `Kirimkan tautan lagu Spotify (contoh: https://open.spotify.com/track/...) atau buka Mini App dengan tombol di bawah:`,
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '🚀 Buka Spotify Downloader',
              web_app: { url: webAppUrl },
            },
          ],
        ],
      },
    });
  } catch (err) {
    console.warn('[TelegramBot] Error handling update:', err);
  }
}

async function sendTelegramMessage(token: string, chatId: number | string, payload: any) {
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        ...payload,
      }),
    });
  } catch (err) {
    console.warn('[TelegramBot] sendMessage error:', err);
  }
}

export async function sendTelegramAudio(
  chatId: number | string,
  filePath: string,
  meta: { title: string; artist: string; duration?: number }
): Promise<{ ok: boolean; description?: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return { ok: false, description: 'Telegram bot token belum dikonfigurasi.' };
  }

  try {
    if (!fs.existsSync(filePath)) {
      return { ok: false, description: 'File audio tidak ditemukan di server.' };
    }

    const fileBuffer = fs.readFileSync(filePath);
    const formData = new FormData();
    formData.append('chat_id', String(chatId));
    formData.append('title', meta.title);
    formData.append('performer', meta.artist);
    formData.append('caption', `🎵 ${meta.artist} - ${meta.title}\n⚡ Diunduh via @SpotifyDWDFreeBot`);
    if (meta.duration) {
      formData.append('duration', String(Math.round(meta.duration)));
    }
    formData.append(
      'audio',
      new Blob([fileBuffer], { type: 'audio/mpeg' }),
      `${meta.artist} - ${meta.title}.mp3`
    );

    const res = await fetch(`https://api.telegram.org/bot${token}/sendAudio`, {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    return data;
  } catch (err: any) {
    console.warn('[TelegramBot] sendAudio error:', err);
    return { ok: false, description: err?.message || 'Gagal mengirim audio ke Telegram' };
  }
}

