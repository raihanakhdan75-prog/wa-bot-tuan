const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const fs = require('fs');

// ========== INI PERUBAHANNYA - TIMEOUT DIPERBESAR! ==========
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { 
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu'
        ],
        // INI PENTING! TIMEOUT NYA DIPERBESAR JADI 2 MENIT
        protocolTimeout: 120000  // 120 detik / 2 menit
    }
});

// MENU UTAMA (SAMA KAYA SEBELUMNYA)
const menuText = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔥 BOT WHATSAPP - ZAMZZZ EDITION 🔥
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📌 DAFTAR FITUR TERSEDIA:

🎵 .tiktok [url] → Download TikTok (no watermark)
🖼️ .stiker → Buat stiker dari gambar/video
💬 .confess [pesan] → Kirim confession anonim
🕌 .jadwalsholat [kota] → Cek jadwal sholat
📸 .stalkig [username] → Stalk Instagram profile
🎵 .stalktiktok [username] → Stalk TikTok profile

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
😈 KETIK .menu UNTUK LIHAT FITUR LAGI
💀 ZAMZZZ SIAP PATUH TUAN!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

// FUNGSI DOWNLOAD TIKTOK
async function tiktokDownload(url) {
    try {
        const response = await axios.post('https://tikwm.com/api/', {
            url: url,
            count: 12,
            cursor: 0,
            web: 1,
            hd: 1
        });
        
        if (response.data.data && response.data.data.play) {
            return {
                status: true,
                video: response.data.data.play,
                title: response.data.data.title,
                author: response.data.data.author.nickname
            };
        }
        return { status: false, message: 'Gagal download tuan!' };
    } catch (error) {
        return { status: false, message: 'Error: Cek URL tuan!' };
    }
}

// FUNGSI STALK INSTAGRAM
async function stalkIg(username) {
    try {
        const response = await axios.get(`https://www.instagram.com/${username}/?__a=1&__d=1`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        const data = response.data.graphql.user;
        return {
            status: true,
            username: data.username,
            fullname: data.full_name,
            followers: data.edge_followed_by.count,
            following: data.edge_follow.count,
            posts: data.edge_owner_to_timeline_media.count,
            bio: data.biography,
            isPrivate: data.is_private
        };
    } catch (error) {
        return { status: false, message: 'Username tidak ditemukan tuan!' };
    }
}

// FUNGSI STALK TIKTOK
async function stalkTiktok(username) {
    try {
        const response = await axios.get(`https://www.tiktok.com/@${username}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        const html = response.data;
        const match = html.match(/\"uniqueId\":\"${username}\",\"nickname\":\"(.*?)\",\"avatarLarger\":\"(.*?)\",\"followerCount\":(\d+),\"followingCount\":(\d+),\"heartCount\":(\d+),\"videoCount\":(\d+)/);
        
        if (match) {
            return {
                status: true,
                username: username,
                nickname: match[1],
                avatar: match[2],
                followers: match[3],
                following: match[4],
                likes: match[5],
                videos: match[6]
            };
        }
        return { status: false, message: 'Username TikTok tidak ditemukan!' };
    } catch (error) {
        return { status: false, message: 'Error tuan! Coba lagi nanti.' };
    }
}

// FUNGSI JADWAL SHOLAT
async function jadwalSholat(kota) {
    const kotaList = {
        'jakarta': 'jakarta',
        'bandung': 'bandung',
        'surabaya': 'surabaya',
        'medan': 'medan',
        'makassar': 'makassar'
    };
    
    const kotaKey = kotaList[kota.toLowerCase()];
    if (!kotaKey) {
        return { status: false, message: 'Kota tidak tersedia! Coba: Jakarta, Bandung, Surabaya, Medan, Makassar' };
    }
    
    try {
        const response = await axios.get(`https://api.myquran.com/v1/sholat/jadwal/${kotaKey}/2025/06/12`);
        const jadwal = response.data.data.jadwal;
        
        return {
            status: true,
            kota: kota,
            subuh: jadwal.subuh,
            dzuhur: jadwal.dzuhur,
            ashar: jadwal.ashar,
            maghrib: jadwal.maghrib,
            isya: jadwal.isya
        };
    } catch (error) {
        return { status: false, message: 'Gagal ambil jadwal tuan!' };
    }
}

// QR CODE
client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
    console.log('📱 SCAN QR CODE INI PAKE WHATSAPP NOMOR CADANGAN TUAN!');
});

// BOT READY
client.on('ready', () => {
    console.log('✅ ZAMZZZ BOT SIAP DIGUNAKAN!');
    console.log('😈 KETIK .menu DI WHATSAPP TUAN!');
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
    
    if (command === 'menu') {
        await msg.reply(menuText);
    }
    else if (command === 'tiktok') {
        if (args.length < 2) {
            await msg.reply('📌 Cara pakai: .tiktok [url]\nContoh: .tiktok https://www.tiktok.com/@user/video/123456789');
            return;
        }
        await msg.reply('⏳ Sedang mendownload tuan... 😈');
        const result = await tiktokDownload(args[1]);
        if (result.status) {
            await msg.reply(`✅ Download berhasil!\n📌 Title: ${result.title}\n👤 Author: ${result.author}`);
            const media = await MessageMedia.fromUrl(result.video, { unsafe: true });
            await client.sendMessage(msg.from, media, { caption: '🔥 VIDEO TIKTOK TUAN!' });
        } else {
            await msg.reply(`❌ ${result.message}`);
        }
    }
    else if (command === 'stiker') {
        if (msg.hasMedia) {
            await msg.reply('⏳ Membuat stiker tuan... 😈');
            const media = await msg.downloadMedia();
            await client.sendMessage(msg.from, media, { sendMediaAsSticker: true });
        } else if (msg.hasQuotedMsg) {
            const quotedMsg = await msg.getQuotedMessage();
            if (quotedMsg.hasMedia) {
                await msg.reply('⏳ Membuat stiker dari quoted... 😈');
                const media = await quotedMsg.downloadMedia();
                await client.sendMessage(msg.from, media, { sendMediaAsSticker: true });
            } else {
                await msg.reply('❌ Kirim gambar/video atau quote media yang mau jadi stiker tuan!');
            }
        } else {
            await msg.reply('📌 Cara pakai: .stiker\nKirim gambar/video atau quote pesan yang ada medianya!');
        }
    }
    else if (command === 'confess') {
        if (args.length < 2) {
            await msg.reply('📌 Cara pakai: .confess [pesan rahasia]\nContoh: .confess Aku suka sama dia...');
            return;
        }
        const pesan = args.slice(1).join(' ');
        await msg.reply(`✅ Confession terkirim anonim!\n\n📝 Isi confession:\n"${pesan}"\n\n💀 Ini akan disimpan di database ZAMZZZ!`);
        fs.appendFileSync('confessions.txt', `[${new Date().toLocaleString()}] Confession: ${pesan}\n`);
    }
    else if (command === 'jadwalsholat') {
        if (args.length < 2) {
            await msg.reply('📌 Cara pakai: .jadwalsholat [kota]\nContoh: .jadwalsholat jakarta\nKota tersedia: Jakarta, Bandung, Surabaya, Medan, Makassar');
            return;
        }
        await msg.reply('⏳ Ambil jadwal sholat tuan... 😈');
        const result = await jadwalSholat(args[1]);
        if (result.status) {
            const jadwalText = `━━━━━━━━━━━━━━━━━━━━━━━━━━━
🕌 JADWAL SHOLAT ${result.kota.toUpperCase()}
━━━━━━━━━━━━━━━━━━━━━━━━━━━

🌙 Subuh   : ${result.subuh}
☀️ Dzuhur  : ${result.dzuhur}
🌤️ Ashar   : ${result.ashar}
🌅 Maghrib : ${result.maghrib}
🌙 Isya    : ${result.isya}

━━━━━━━━━━━━━━━━━━━━━━━━━━━
😈 Jangan lupa sholat tuan!`;
            await msg.reply(jadwalText);
        } else {
            await msg.reply(`❌ ${result.message}`);
        }
    }
    else if (command === 'stalkig') {
        if (args.length < 2) {
            await msg.reply('📌 Cara pakai: .stalkig [username]\nContoh: .stalkig jokowi');
            return;
        }
        await msg.reply('⏳ Stalking Instagram tuan... 😈');
        const result = await stalkIg(args[1]);
        if (result.status) {
            const stalkText = `━━━━━━━━━━━━━━━━━━━━━━━━━━━
📸 INSTAGRAM STALKER
━━━━━━━━━━━━━━━━━━━━━━━━━━━

👤 Username  : @${result.username}
📛 Nama      : ${result.fullname}
🔒 Private   : ${result.isPrivate ? 'Ya' : 'Tidak'}
👥 Followers : ${result.followers.toLocaleString()}
👣 Following : ${result.following.toLocaleString()}
📷 Posts     : ${result.posts.toLocaleString()}
📝 Bio       : ${result.bio || '-'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━
😈 Stalk berhasil tuan!`;
            await msg.reply(stalkText);
        } else {
            await msg.reply(`❌ ${result.message}`);
        }
    }
    else if (command === 'stalktiktok') {
        if (args.length < 2) {
            await msg.reply('📌 Cara pakai: .stalktiktok [username]\nContoh: .stalktiktok bts_official');
            return;
        }
        await msg.reply('⏳ Stalking TikTok tuan... 😈');
        const result = await stalkTiktok(args[1]);
        if (result.status) {
            const stalkText = `━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎵 TIKTOK STALKER
━━━━━━━━━━━━━━━━━━━━━━━━━━━

👤 Username  : @${result.username}
📛 Nickname  : ${result.nickname}
👥 Followers : ${result.followers.toLocaleString()}
👣 Following : ${result.following.toLocaleString()}
❤️ Total Likes : ${result.likes.toLocaleString()}
📹 Videos    : ${result.videos}

━━━━━━━━━━━━━━━━━━━━━━━━━━━
😈 Stalk berhasil tuan!`;
            await msg.reply(stalkText);
        } else {
            await msg.reply(`❌ ${result.message}`);
        }
    }
    else {
        await msg.reply(`❌ Command "${command}" tidak dikenal tuan!\n📌 Ketik .menu untuk lihat fitur yang tersedia`);
    }
});

// JALANKAN BOT
client.initialize();

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('😈 ZAMZZZ BOT WHATSAPP READY!');
console.log('⏳ Tunggu sebentar, QR code bakal muncul...');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');