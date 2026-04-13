require('dotenv').config();

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

const youtubedl = require('youtube-dl-exec');

// ============================================================
// 設定
// ============================================================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates
  ]
});

const player = createAudioPlayer();
let currentConnection = null;
let currentBgmId = null;

// BGMリスト
const BGM_LIST = {
  wave: {
    label: '🌊 波の音',
    url: 'https://www.youtube.com/watch?v=B3UM8TizqYQ',
    description: '波の音で集中が2時間続く！（25分集中+5分休憩）'
  },
  forest: {
    label: '🌳 森の清流',
    url: 'https://www.youtube.com/watch?v=-11GWcyj_Is',
    description: '森の清流で集中！（25分集中+5分休憩）'
  },
  fire: {
    label: '🔥 焚き火',
    url: 'https://www.youtube.com/watch?v=iq9jqLtBx9c',
    description: '焚き火の音で集中！（25分集中+5分休憩）'
  },
  cafe: {
    label: '☕ あつ森カフェ',
    url: 'https://www.youtube.com/watch?v=v3oPr2InUfc',
    description: 'マスターのいる喫茶店でじっくり集中'
  },
  rain: {
    label: '🌧 雨の音',
    url: 'https://www.youtube.com/watch?v=6NCCDrn0i9g',
    description: '雨の音2時間（25分集中+5分休憩）'
  }
};

// ============================================================
// UI 生成
// ============================================================

function createBgmButtons() {
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('wave')
      .setLabel('🌊 波')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('forest')
      .setLabel('🌳 森')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('fire')
      .setLabel('🔥 焚き火')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('cafe')
      .setLabel('☕ あつ森')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('rain')
      .setLabel('🌧 雨')
      .setStyle(ButtonStyle.Primary)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('stop')
      .setLabel('⏹ 停止')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('nowplaying')
      .setLabel('📊 再生状況')
      .setStyle(ButtonStyle.Secondary)
  );

  return [row1, row2];
}

function createEmbed() {
  return new EmbedBuilder()
    .setTitle('🍅 ポモドーロBGM')
    .setDescription(
      'ボイスチャンネルに入ってからボタンを押してください。\n' +
      'YouTube動画にポモドーロタイマーが含まれています（25分集中+5分休憩）。\n\n' +
      Object.values(BGM_LIST)
        .map(bgm => `**${bgm.label}** — ${bgm.description}`)
        .join('\n')
    )
    .setColor(0xff6347)
    .setFooter({ text: 'VCに入室 → ボタンを押す → BGM再生開始' });
}

// ============================================================
// 再生処理
// ============================================================

async function playBgm(url) {
  try {
    const subprocess = youtubedl.exec(url, {
      output: '-',
      quiet: true,
      noWarnings: true,
      format: 'bestaudio[ext=webm]/bestaudio',
    });
    const resource = createAudioResource(subprocess.stdout);
    player.play(resource);
    console.log(`▶ 再生開始: ${url}`);
  } catch (err) {
    console.error('再生エラー:', err.message);
    setTimeout(() => playBgm(url), 5000);
  }
}

    // 5秒後にリトライ
    setTimeout(() => {
      console.log('リトライ中...');
      playBgm(url);
    }, 5000);
  }
}

// 再生終了時に自動ループ（動画が終わったら再スタート）
player.on(AudioPlayerStatus.Idle, () => {
  if (currentBgmId && BGM_LIST[currentBgmId]) {
    console.log('再生完了 → 自動ループ');
    playBgm(BGM_LIST[currentBgmId].url);
  }
});

player.on('error', (err) => {
  console.error('プレイヤーエラー:', err.message);

  // エラー時もリトライ
  if (currentBgmId && BGM_LIST[currentBgmId]) {
    setTimeout(() => {
      console.log('エラー後リトライ...');
      playBgm(BGM_LIST[currentBgmId].url);
    }, 5000);
  }
});

// ============================================================
// VC接続
// ============================================================

function connectToVoice(voiceChannel, guild) {
  // 既に同じチャンネルに接続済みならそのまま使う
  if (currentConnection && currentConnection.joinConfig.channelId === voiceChannel.id) {
    return currentConnection;
  }

  // 別のチャンネルに接続済みなら切断
  if (currentConnection) {
    currentConnection.destroy();
  }

  const connection = joinVoiceChannel({
    channelId: voiceChannel.id,
    guildId: guild.id,
    adapterCreator: guild.voiceAdapterCreator
  });

  connection.subscribe(player);

  // 切断時のクリーンアップ
  connection.on(VoiceConnectionStatus.Disconnected, async () => {
    try {
      // 再接続を試みる
      await Promise.race([
        entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
        entersState(connection, VoiceConnectionStatus.Connecting, 5_000)
      ]);
    } catch {
      // 再接続失敗 → クリーンアップ
      connection.destroy();
      currentConnection = null;
      currentBgmId = null;
      console.log('VC切断（再接続失敗）');
    }
  });

  currentConnection = connection;
  return connection;
}

// ============================================================
// Bot起動
// ============================================================

client.once('ready', async () => {
  console.log(`✅ ログイン: ${client.user.tag}`);

  // テキストチャンネルにUI送信
  try {
    const textChannel = await client.channels.fetch(process.env.TEXT_CHANNEL_ID);

    if (textChannel) {
      await textChannel.send({
        embeds: [createEmbed()],
        components: createBgmButtons()
      });
      console.log('✅ UIをテキストチャンネルに送信しました');
    }
  } catch (err) {
    console.error('UI送信エラー:', err.message);
  }
});

// ============================================================
// ボタン操作
// ============================================================

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;

  const member = interaction.member;
  const voiceChannel = member.voice?.channel;

  // ── 停止ボタン ──
  if (interaction.customId === 'stop') {
    player.stop();
    currentBgmId = null;

    if (currentConnection) {
      currentConnection.destroy();
      currentConnection = null;
    }

    return interaction.reply({
      content: '⏹ 停止しました。',
      ephemeral: true
    });
  }

  // ── 再生状況ボタン ──
  if (interaction.customId === 'nowplaying') {
    if (!currentBgmId) {
      return interaction.reply({
        content: '現在再生中のBGMはありません。',
        ephemeral: true
      });
    }

    const bgm = BGM_LIST[currentBgmId];
    return interaction.reply({
      content: `🎧 再生中: **${bgm.label}**\n${bgm.description}\n${bgm.url}`,
      ephemeral: true
    });
  }

  // ── BGM選択ボタン ──
  const bgm = BGM_LIST[interaction.customId];
  if (!bgm) return;

  // VCに入っていない場合
  if (!voiceChannel) {
    return interaction.reply({
      content: '⚠️ 先にボイスチャンネルに入ってからボタンを押してください。',
      ephemeral: true
    });
  }

  // 接続 & 再生
  try {
    await interaction.deferReply({ ephemeral: true });

    connectToVoice(voiceChannel, interaction.guild);
    currentBgmId = interaction.customId;
    await playBgm(bgm.url);

    await interaction.editReply({
      content: `🎧 **${bgm.label}** を再生開始しました！\nVC: ${voiceChannel.name}`
    });
  } catch (err) {
    console.error('接続/再生エラー:', err);
    await interaction.editReply({
      content: '⚠️ 再生に失敗しました。もう一度お試しください。'
    });
  }
});

// ============================================================
// 誰もいなくなったら自動退出
// ============================================================

client.on('voiceStateUpdate', (oldState, newState) => {
  if (!currentConnection) return;

  const botChannelId = currentConnection.joinConfig.channelId;
  const channel = oldState.guild.channels.cache.get(botChannelId);

  if (!channel) return;

  // Bot以外のメンバーが0人になったら退出
  const members = channel.members.filter(m => !m.user.bot);
  if (members.size === 0) {
    console.log('VC無人 → 自動退出');
    player.stop();
    currentBgmId = null;
    currentConnection.destroy();
    currentConnection = null;
  }
});

// ============================================================
// 起動
// ============================================================

client.login(process.env.DISCORD_TOKEN);
