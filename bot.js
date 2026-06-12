const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const fs = require('fs');

// ========== KONFIGURASI BOT ==========
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { 
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu',
            // TAMBAHKAN INI UNTUK FRAME STABILITY!
            '--disable-features=IsolateOrigins,site-per-process',
            '--disable-site-isolation-trials',
            // MEMORY MANAGEMENT
            '--js-flags=--max-old-space-size=512',
            '--renderer-process-limit=2',
            // PERFORMANCE
            '--disable-extensions',
            '--disable-software-rasterizer',
            '--mute-audio'
        ],
        protocolTimeout: 120000
    }
});

const TARGET_CONFESS_NUMBER = '6283159605430' // GANTI DENGAN NOMOR SEBAGAI OWNER! Contoh: 6281234567890

// MENU UTAMA
const menuText = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔥 BOT WHATSAPP - RHNNADF EDITION 🔥
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NOTE : JANGAN SPAM / TELEPON!!!

📌 DAFTAR FITUR TERSEDIA:

🎵 .tiktok [url] → Download TikTok (no watermark)
🖼️ .stiker → Buat stiker dari gambar/video
💬 .confess [pesan] → Kirim confession anonim ke owner
🕌 .jadwalsholat [kota] → Cek jadwal sholat
📸 .stalkig [username] → Stalk Instagram profile
🎵 .stalktiktok [username] → Stalk TikTok profile

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📞 .callowner → Hubungi owner bot
📝 .info → Info tentang bot

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
😈 BOT MILIK: RHNNADF
💀 SIAP PATUH, SILAHKAN KIRIM TEKS SESUAI FITUR!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

// FUNGSI JADWAL SHOLAT - PAKE API BARU YANG WORK
async function jadwalSholat(kota) {
    const kotaMap = {
        'jakarta': '1301',
        'bandung': '1302', 
        'surabaya': '1303',
        'medan': '1304',
        'makassar': '1305',
        'depok': '1301',
        'bekasi': '1301',
        'tangerang': '1301',
        'semarang': '1306',
        'yogyakarta': '1307'
    };
    
    const kotaId = kotaMap[kota.toLowerCase()];
    if (!kotaId) {
        return { status: false, message: 'Kota tidak tersedia! Coba: Jakarta, Bandung, Surabaya, Medan, Makassar, Tangerang' };
    }
    
    try {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        
        // Pake API alternatif
        const response = await axios.get(`https://api.aladhan.com/v1/timingsByCity/${day}-${month}-${year}?city=${kota}&country=Indonesia&method=2`, {
            timeout: 10000
        });
        
        if (response.data.code === 200 && response.data.data) {
            const timings = response.data.data.timings;
            return {
                status: true,
                kota: kota.toUpperCase(),
                tanggal: response.data.data.date.readable,
                subuh: timings.Fajr,
                dzuhur: timings.Dhuhr,
                ashar: timings.Asr,
                maghrib: timings.Maghrib,
                isya: timings.Isha
            };
        }
        return { status: false, message: 'Gagal ambil jadwal! Coba kota lain.' };
    } catch (error) {
        console.log('Jadwal Error:', error.message);
        return { status: false, message: 'Error ambil jadwal! Coba lagi nanti.' };
    }
}

// FUNGSI DOWNLOAD TIKTOK - VERSI KIRIM VIDEO LANGSUNG
async function tiktokDownload(url) {
    try {
        const response = await axios.post('https://tikwm.com/api/', {
            url: url,
            count: 12,
            cursor: 0,
            web: 1,
            hd: 1
        }, { 
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        if (response.data && response.data.data && response.data.data.play) {
            // Ambil URL video yang LENGKAP
            let videoUrl = response.data.data.play;
            
            // Kalo URL nya cuma path, tambahin domain
            if (videoUrl && videoUrl.startsWith('/')) {
                videoUrl = 'https://tikwm.com' + videoUrl;
            }
            
            // Coba ambil HD version
            if (response.data.data.hdplay) {
                let hdUrl = response.data.data.hdplay;
                if (hdUrl && hdUrl.startsWith('/')) {
                    hdUrl = 'https://tikwm.com' + hdUrl;
                }
                videoUrl = hdUrl;
            }
            
            return {
                status: true,
                video: videoUrl,
                title: response.data.data.title || 'TikTok Video',
                author: response.data.data.author?.unique_id || 'Unknown'
            };
        }
        return { status: false, message: 'Gagal download!' };
    } catch (error) {
        return { status: false, message: 'Error! Coba lagi.' };
    }
}

// FUNGSI STALK INSTAGRAM - PAKE API ANONIM
async function stalkIg(username) {
    try {
        // Pake service mirror yang masih work
        const response = await axios.get(`https://www.picnob.com/profile/${username}/`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
            },
            timeout: 15000
        });
        
        const html = response.data;
        
        // Extract data dari HTML
        let followers = '?';
        let following = '?';
        let posts = '?';
        
        const followerMatch = html.match(/Followers<\/div>\s*<div[^>]*>\s*([\d.]+[KM]?)\s*</i);
        if (followerMatch) followers = followerMatch[1];
        
        const followingMatch = html.match(/Following<\/div>\s*<div[^>]*>\s*([\d.]+[KM]?)\s*</i);
        if (followingMatch) following = followingMatch[1];
        
        const postsMatch = html.match(/Posts<\/div>\s*<div[^>]*>\s*([\d.]+[KM]?)\s*</i);
        if (postsMatch) posts = postsMatch[1];
        
        if (followers === '?') {
            return { status: false, message: 'Username IG tidak ditemukan!' };
        }
        
        return {
            status: true,
            username: username,
            fullname: username,
            followers: followers,
            following: following,
            posts: posts,
            bio: 'Via picnob.com',
            isPrivate: false
        };
    } catch (error) {
        return { status: false, message: 'Gagal ambil data IG! Coba username lain.' };
    }
}

// FUNGSI STALK TIKTOK - PAKE API TIKWM
async function stalkTiktok(username) {
    try {
        const cleanUsername = username.replace('@', '');
        
        // Pake API tikwm yang reliable
        const response = await axios.get(`https://www.tikwm.com/api/user/info?unique_id=${cleanUsername}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json'
            },
            timeout: 15000
        });
        
        if (response.data && response.data.data && response.data.data.user) {
            const user = response.data.data.user;
            const stats = response.data.data.stats || {};
            
            return {
                status: true,
                username: user.unique_id || cleanUsername,
                nickname: user.nickname || cleanUsername,
                followers: stats.follower_count || 0,
                following: stats.following_count || 0,
                likes: stats.heart_count || 0,
                videos: stats.video_count || 0
            };
        }
        
        return { status: false, message: 'Username TikTok tidak ditemukan!' };
    } catch (error) {
        return { status: false, message: 'Error ambil data TikTok! Coba lagi.' };
    }
}

// QR CODE
client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
    console.log('📱 SCAN QR CODE INI PAKE WHATSAPP NOMOR CADANGAN!');
});

// BOT READY
client.on('ready', () => {
    console.log('✅ RHNNADF BOT SIAP DIGUNAKAN!');
    console.log('😈 KETIK .menu DI WHATSAPP!');
    console.log(`📞 Nomor tujuan confess: ${TARGET_CONFESS_NUMBER}`);
});

// HANDLE PESAN
client.on('message', async (msg) => {
    if (msg.from === 'status@broadcast') return;
    if (msg.author === 'status@broadcast') return;
    
    const body = msg.body;
    const prefix = '.';
    
    if (!body.startsWith(prefix)) return;
    
    const args = body.slice(prefix.length).trim().split(/ +/);
    const command = args[0].toLowerCase();
    
    // MENU
    if (command === 'menu') {
        await msg.reply(menuText);
    }
    
    // INFO BOT
    else if (command === 'info') {
        const infoText = `━━━━━━━━━━━━━━━━━━━━━━━━━━━
📱 BOT WHATSAPP - RHNNADF
━━━━━━━━━━━━━━━━━━━━━━━━━━━

🤖 Nama Bot: RHNNADF BOT
👑 Owner: RHNNADF
⚡ Version: 2.0
📅 Status: ACTIVE

📌 Fitur:
• Download TikTok
• Sticker Maker
• Confession Anonim
• Jadwal Sholat
• Stalk IG
• Stalk TikTok

━━━━━━━━━━━━━━━━━━━━━━━━━━━
😈 SIAP PATUH PERINTAH KAMU SESUAI FITUR!
💀 BOT MILIK RHNNADF
━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
        await msg.reply(infoText);
    }
    
    // CALL OWNER
    else if (command === 'callowner') {
        await msg.reply(`📞 HUBUNGI OWNER RHNNADF BOT\n\nNomor: ${TARGET_CONFESS_NUMBER}\n\nKlik link berikut untuk chat:\nhttps://wa.me/${TARGET_CONFESS_NUMBER}\n\n😈 Owner akan merespon secepatnya!`);
    }
    
    // CONFESS - KIRIM KE NOMOR TUJUAN
        // CONFESS - KIRIM KE NOMOR YANG DITUJU (FORMAT 0xxx)
    else if (command === 'confess') {
        if (args.length < 3) {
            await msg.reply(`📌 Cara pakai: .confess [nomor_tujuan] [pesan]\n\nContoh: .confess 081234567890 Hallo ini pesan rahasia\n\n⚠️ Nomor pakai format 0xxx (seperti nomor biasa)\n💀 Pesan akan dikirim ANONIM ke nomor tujuan!\n\n📞 Contoh lain: .confess 089876543210 Aku suka kamu`);
            return;
        }
        
        let targetNumberRaw = args[1];
        const pesan = args.slice(2).join(' ');
        const pengirim = msg.from;
        const waktu = new Date().toLocaleString('id-ID');
        
        // Validasi nomor (mulai dengan 0 dan angka selanjutnya)
        if (!targetNumberRaw.match(/^0[0-9]{9,13}$/)) {
            await msg.reply(`❌ Format nomor salah!\n\n📌 Gunakan format: 0xxx (seperti nomor HP biasa)\nContoh: 081234567890\n\n📞 Jangan pakai +62 atau spasi!`);
            return;
        }
        
        // Konversi format 0xxx ke 62xxx untuk WhatsApp API
        let whatsappNumber = targetNumberRaw.replace(/^0/, '62');
        whatsappNumber = whatsappNumber.includes('@') ? whatsappNumber : `${whatsappNumber}@c.us`;
        
        // Format pesan confess
        const confessMessage = `━━━━━━━━━━━━━━━━━━━━━━━━━━━
💌 CONFESSION ANONIM
━━━━━━━━━━━━━━━━━━━━━━━━━━━

📝 ISI PESAN:
"${pesan}"

📅 Waktu: ${waktu}
🔗 Dari: Seseorang yang ingin anonim

━━━━━━━━━━━━━━━━━━━━━━━━━━━
😈 BOT RHNNADF - Confession System
💀 Pesan ini dikirim secara anonim
━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
        
        // Kirim ke nomor tujuan
        try {
            await client.sendMessage(whatsappNumber, confessMessage);
            
            // Balasan ke pengirim
            await msg.reply(`✅ CONFESSION BERHASIL DIKIRIM!\n\n📞 Nomor tujuan: ${targetNumberRaw}\n📝 Pesan: "${pesan}"\n\n💀 Pesan telah dikirim secara ANONIM ke nomor tujuan.\n😈 Terima kasih sudah menggunakan fitur confess RHNNADF BOT!`);
            
            // Simpan ke file log
            fs.appendFileSync('confessions.txt', `[${waktu}] Dari: ${pengirim} | Ke: ${targetNumberRaw} | Pesan: ${pesan}\n`);
            console.log(`✅ Confess terkirim dari ${pengirim} ke ${targetNumberRaw}`);
            
        } catch (error) {
            console.log('Error kirim confess:', error);
            await msg.reply(`❌ Gagal mengirim confess!\n\nMungkin nomor ${targetNumberRaw} tidak valid atau belum terdaftar di WhatsApp.\n\n📌 Pastikan nomor tujuan aktif dan menggunakan WhatsApp!`);
        }
    }
    
// TIKTOK DOWNLOAD - KIRIM VIDEO LANGSUNG
else if (command === 'tiktok') {
    if (args.length < 2) {
        await msg.reply('📌 Cara pakai: .tiktok [url]\nContoh: .tiktok https://www.tiktok.com/@user/video/123456789');
        return;
    }
    await msg.reply('⏳ Sedang mendownload, Tunggu... 😈');
    const result = await tiktokDownload(args[1]);
    
    if (result.status) {
        try {
            // Download video dari URL lengkap
            const videoResponse = await axios.get(result.video, { 
                responseType: 'arraybuffer',
                timeout: 60000
            });
            const videoBuffer = Buffer.from(videoResponse.data, 'binary');
            const base64 = videoBuffer.toString('base64');
            const media = new MessageMedia('video/mp4', base64, 'tiktok.mp4');
            
            await client.sendMessage(msg.from, media, { 
                caption: `🔥 TikTok - RHNNADF BOT\n📌 ${result.title}\n👤 @${result.author}`
            });
            
            await msg.reply(`✅ Video terkirim!`);
        } catch (err) {
            await msg.reply(`❌ Gagal mengirim video! File terlalu besar. Coba kirim link aja.\n\n🔗 LINK: ${result.video}`);
        }
    } else {
        await msg.reply(`❌ ${result.message}`);
    }
}
    
    // STIKER
    else if (command === 'stiker') {
        if (msg.hasMedia) {
            await msg.reply('⏳ Membuat stiker, tunggu... 😈');
            const media = await msg.downloadMedia();
            await client.sendMessage(msg.from, media, { sendMediaAsSticker: true });
        } else if (msg.hasQuotedMsg) {
            const quotedMsg = await msg.getQuotedMessage();
            if (quotedMsg.hasMedia) {
                await msg.reply('⏳ Membuat stiker dari quoted... 😈');
                const media = await quotedMsg.downloadMedia();
                await client.sendMessage(msg.from, media, { sendMediaAsSticker: true });
            } else {
                await msg.reply('❌ Kirim gambar/video atau quote media yang mau jadi stiker!');
            }
        } else {
            await msg.reply('📌 Cara pakai: .stiker\nKirim gambar/video atau quote pesan yang ada medianya!');
        }
    }
    
    // JADWAL SHOLAT
    else if (command === 'jadwalsholat') {
        if (args.length < 2) {
            await msg.reply('📌 Cara pakai: .jadwalsholat [kota]\nContoh: .jadwalsholat jakarta\nKota tersedia: Jakarta, Bandung, Surabaya, Medan, Makassar, Tangerang');
            return;
        }
        await msg.reply('⏳ Ambil jadwal sholat, tunggu... 😈');
        const result = await jadwalSholat(args[1]);
        if (result.status) {
            const jadwalText = `━━━━━━━━━━━━━━━━━━━━━━━━━━━
🕌 JADWAL SHOLAT ${result.kota}
📅 ${result.tanggal}
━━━━━━━━━━━━━━━━━━━━━━━━━━━

🌙 Subuh   : ${result.subuh}
☀️ Dzuhur  : ${result.dzuhur}
🌤️ Ashar   : ${result.ashar}
🌅 Maghrib : ${result.maghrib}
🌙 Isya    : ${result.isya}

━━━━━━━━━━━━━━━━━━━━━━━━━━━
😈 RHNNADF BOT - Jangan lupa sholat ya!
━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
            await msg.reply(jadwalText);
        } else {
            await msg.reply(`❌ ${result.message}`);
        }
    }
    
    // STALK IG
    else if (command === 'stalkig') {
        if (args.length < 2) {
            await msg.reply('📌 Cara pakai: .stalkig [username]\nContoh: .stalkig rhnnadf_\nTanpa tanda @ ya!');
            return;
        }
        await msg.reply('⏳ Stalking Instagram, tunggu... 😈');
        const result = await stalkIg(args[1]);
        if (result.status) {
            const stalkText = `━━━━━━━━━━━━━━━━━━━━━━━━━━━
📸 INSTAGRAM STALKER - RHNNADF
━━━━━━━━━━━━━━━━━━━━━━━━━━━

👤 Username  : @${result.username}
📛 Nama      : ${result.fullname}
🔒 Private   : ${result.isPrivate ? '🔒 Ya' : '🌍 Tidak'}
👥 Followers : ${Number(result.followers).toLocaleString()}
👣 Following : ${Number(result.following).toLocaleString()}
📷 Posts     : ${Number(result.posts).toLocaleString()}
📝 Bio       : ${result.bio || '-'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━
😈 Stalk berhasil ya!`;
            await msg.reply(stalkText);
        } else {
            await msg.reply(`❌ ${result.message}`);
        }
    }
    
    // STALK TIKTOK
    else if (command === 'stalktiktok') {
        if (args.length < 2) {
            await msg.reply('📌 Cara pakai: .stalktiktok [username]\nContoh: .stalktiktok bts_official\nTanpa tanda @ ya!');
            return;
        }
        await msg.reply('⏳ Stalking TikTok, tunggu... 😈');
        const result = await stalkTiktok(args[1]);
        if (result.status) {
            const stalkText = `━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎵 TIKTOK STALKER - RHNNADF
━━━━━━━━━━━━━━━━━━━━━━━━━━━

👤 Username  : @${result.username}
📛 Nickname  : ${result.nickname}
👥 Followers : ${Number(result.followers).toLocaleString()}
👣 Following : ${Number(result.following).toLocaleString()}
❤️ Total Likes : ${Number(result.likes).toLocaleString()}
📹 Videos    : ${Number(result.videos).toLocaleString()}

━━━━━━━━━━━━━━━━━━━━━━━━━━━
😈 Stalk berhasil!`;
            await msg.reply(stalkText);
        } else {
            await msg.reply(`❌ ${result.message}`);
        }
    }
    
    // COMMAND TIDAK DIKENAL
    else {
        await msg.reply(`❌ Command "${command}" tidak dikenal!\n📌 Ketik .menu untuk lihat fitur yang tersedia`);
    }
});

// HANDLE SESSION CLOSED - AUTO RECONNECT
client.on('disconnected', async (reason) => {
    console.log('⚠️ Bot disconnected:', reason);
    console.log('🔄 Mencoba reconnect dalam 5 detik...');
    setTimeout(() => {
        client.initialize();
    }, 5000);
});

// HANDLE UNHANDLED REJECTION
process.on('unhandledRejection', (reason, promise) => {
    console.log('Unhandled Rejection at:', promise, 'reason:', reason);
});

// HANDLE SIGINT (CTRL+C)
process.on('SIGINT', async () => {
    console.log('⚠️ Shutting down...');
    await client.destroy();
    process.exit(0);
});

// JALANKAN BOT
client.initialize();

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('😈 RHNNADF BOT WHATSAPP READY!');
console.log('💀 BOT MILIK: RHNNADF');
console.log('📞 NOMOR TUJUAN CONFESS: ' + TARGET_CONFESS_NUMBER);
console.log('⏳ Tunggu sebentar, QR code bakal muncul...');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
