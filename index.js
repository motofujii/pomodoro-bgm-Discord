require('dotenv').config();
const { spawn } = require('child_process');

const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} = require('discord.js');

const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState
} = require('@discordjs/voice');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates]
});

const player = createAudioPlayer();
let currentConnection = null;
let currentBgmId = null;

const BGM_LIST = {
  wave:   { label: '🌊 波の音',      url: 'https://www.youtube.com/watch?v=B3UM8TizqYQ' },
  forest: { label: '🌳 森の清流',    url: 'https://www.youtube.com/watch?v=-11GWcyj_Is' },
  fire:   { label: '🔥 焚き火',      url: 'https://www.youtube.com/watch?v=iq9jqLtBx9c' },
  cafe:   { label: '☕ あつ森カフェ', url: 'https://www.youtube.com/watch?v=v3oPr2InUfc' },
  rain:   { label: '🌧 雨の音',      url: 'https://www.youtube.com/watch?v=6NCCDrn0i9g' }
};

function createBgmButtons() {
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('wave').setLabel('🌊 波').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('forest').setLabel('🌳 森').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('fire').setLabel('🔥 焚き火').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('cafe').setLabel('☕ あつ森').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('rain').setLabel('🌧 雨').setStyle(ButtonStyle.Primary)
  );
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('stop').setLabel('⏹ 停止').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('nowplaying').setLabel('📊 再生状況').setStyle(ButtonStyle.Secondary)
  );
  return [row1, row2];
}

function createEmbed() {
  return new EmbedBuilder()
    .setTitle('🍅 ポモドーロBGM')
    .setDescription('ボイスチャンネルに入ってからボタンを押してください。\n（25分集中+5分休憩のタイマー付きBGM）')
    .setColor(0xff6347)
    .setFooter({ text: 'VCに入室 → ボタンを押す → BGM再生開始' });
}

function playBgm(url) {
  return new Promise((resolve, reject) => {
    const args = [
      url,
      '--output', '-',
      '--format', 'bestaudio[ext=webm]/bestaudio/best',
      '--quiet',
      '--no-warnings',
      '--no-check-certificates',
      '--extractor-args', 'youtube:player_client=android',
      '--add-header', 'User-Agent:Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36'
    ];

    const ytdlp = spawn('yt-dlp', args);

    ytdlp.stderr.on('data', (data) => {
      console.error('yt-dlp stderr:', data.toString().trim());
    });

    ytdlp.on('error', (err) => {
      console.error('yt-dlp起動エラー:', err.message);
      reject(err);
    });

    const resource = createAudioResource(ytdlp.stdout);
    player.play(resource);
    console.log(`▶ 再生開始: ${url}`);
    resolve();
  });
}

player.on(AudioPlayerStatus.Idle, () => {
  if (currentBgmId && BGM_LIST[currentBgmId]) {
    console.log('再生完了 → 3秒後に自動ループ');
    setTimeout(() => playBgm(BGM_LIST[currentBgmId].url).catch(console.error), 3000);
  }
});

player.on('error', (err) => {
  console.error('プレイヤーエラー:', err.message);
  if (currentBgmId && BGM_LIST[currentBgmId]) {
    setTimeout(() => playBgm(BGM_LIST[currentBgmId].url).catch(console.error), 30000);
  }
});

function connectToVoice(voiceChannel, guild) {
  if (currentConnection && currentConnection.joinConfig.channelId === voiceChannel.id) {
    return currentConnection;
  }
  if (currentConnection) currentConnection.destroy();
  const connection = joinVoiceChannel({
    channelId: voiceChannel.id,
    guildId: guild.id,
    adapterCreator: guild.voiceAdapterCreator
  });
  connection.subscribe(player);
  connection.on(VoiceConnectionStatus.Disconnected, async () => {
    try {
      await Promise.race([
        entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
        entersState(connection, VoiceConnectionStatus.Connecting, 5_000)
      ]);
    } catch {
      connection.destroy();
      currentConnection = null;
      currentBgmId = null;
    }
  });
  currentConnection = connection;
  return connection;
}

client.once('ready', async () => {
  console.log(`✅ ログイン: ${client.user.tag}`);
  try {
    const textChannel = await client.channels.fetch(process.env.TEXT_CHANNEL_ID);
    if (textChannel) {
      await textChannel.send({ embeds: [createEmbed()], components: createBgmButtons() });
      console.log('✅ UIをテキストチャンネルに送信しました');
    }
  } catch (err) {
    console.error('UI送信エラー:', err.message);
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;
  const voiceChannel = interaction.member?.voice?.channel;

  if (interaction.customId === 'stop') {
    player.stop();
    currentBgmId = null;
    if (currentConnection) { currentConnection.destroy(); currentConnection = null; }
    return interaction.reply({ content: '⏹ 停止しました。', flags: 64 });
  }

  if (interaction.customId === 'nowplaying') {
    if (!currentBgmId) return interaction.reply({ content: '現在再生中のBGMはありません。', flags: 64 });
    return interaction.reply({ content: `🎧 再生中: **${BGM_LIST[currentBgmId].label}**`, flags: 64 });
  }

  const bgm = BGM_LIST[interaction.customId];
  if (!bgm) return;

  if (!voiceChannel) {
    return interaction.reply({ content: '⚠️ 先にボイスチャンネルに入ってください。', flags: 64 });
  }

  try {
    await interaction.deferReply({ flags: 64 });
    connectToVoice(voiceChannel, interaction.guild);
    currentBgmId = interaction.customId;
    await playBgm(bgm.url);
    await interaction.editReply({ content: `🎧 **${bgm.label}** を再生開始しました！` });
  } catch (err) {
    console.error('再生エラー:', err);
    await interaction.editReply({ content: '⚠️ 再生に失敗しました。' });
  }
});

client.on('voiceStateUpdate', (oldState) => {
  if (!currentConnection) return;
  const channel = oldState.guild.channels.cache.get(currentConnection.joinConfig.channelId);
  if (!channel) return;
  if (channel.members.filter(m => !m.user.bot).size === 0) {
    player.stop();
    currentBgmId = null;
    currentConnection.destroy();
    currentConnection = null;
    console.log('VC無人 → 自動退出');
  }
});

client.login(process.env.DISCORD_TOKEN);
