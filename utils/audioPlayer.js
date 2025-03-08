const { createAudioPlayer, createAudioResource, joinVoiceChannel, AudioPlayerStatus } = require('@discordjs/voice');
const play = require('play-dl');

async function playAudio(voiceChannel, youtubeUrl) {
  try {
    // 음성 채널 연결
    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: voiceChannel.guild.id,
      adapterCreator: voiceChannel.guild.voiceAdapterCreator,
    });

    // 유튜브 스트림 생성
    const stream = await play.stream(youtubeUrl);
    
    // 오디오 리소스 및 플레이어 생성
    const resource = createAudioResource(stream.stream, {
      inputType: stream.type,
    });
    
    const player = createAudioPlayer();
    connection.subscribe(player);
    
    // 오디오 재생
    player.play(resource);
    
    // 최대 1분 후 연결 종료
    setTimeout(() => {
      player.stop();
      connection.destroy();
    }, 60000);
    
    // 재생 완료 시 연결 종료
    player.on(AudioPlayerStatus.Idle, () => {
      connection.destroy();
    });
    
    return true;
  } catch (error) {
    console.error('오디오 재생 중 오류 발생:', error);
    return false;
  }
}

module.exports = { playAudio }; 