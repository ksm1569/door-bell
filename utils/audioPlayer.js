const { createAudioPlayer, createAudioResource, joinVoiceChannel, AudioPlayerStatus, VoiceConnectionStatus, entersState, StreamType } = require('@discordjs/voice');
const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
const execAsync = promisify(exec);

// YouTube URL 검증 및 정규화 함수
function validateYoutubeUrl(url) {
  try {
    // 기본 URL 형식 검증
    const parsedUrl = new URL(url);
    
    // YouTube 도메인 확인
    const isYoutubeDomain = 
      parsedUrl.hostname === 'youtube.com' || 
      parsedUrl.hostname === 'www.youtube.com' || 
      parsedUrl.hostname === 'youtu.be' ||
      parsedUrl.hostname === 'm.youtube.com';
    
    if (!isYoutubeDomain) {
      throw new Error('YouTube URL이 아닙니다.');
    }
    
    // youtu.be 형식인 경우 정규 youtube.com 형식으로 변환
    if (parsedUrl.hostname === 'youtu.be') {
      const videoId = parsedUrl.pathname.substring(1);
      return `https://www.youtube.com/watch?v=${videoId}`;
    }
    
    // 이미 정상적인 youtube.com 형식인 경우
    if (parsedUrl.searchParams.has('v')) {
      return url;
    }
    
    throw new Error('유효한 YouTube 비디오 URL이 아닙니다.');
  } catch (error) {
    console.error('YouTube URL 검증 실패:', error.message, '입력된 URL:', url);
    throw new Error('유효한 YouTube URL이 아닙니다: ' + error.message);
  }
}

// 임시 파일 경로 생성 함수
function getTempFilePath(videoId) {
  // 임시 디렉토리 확인 및 생성
  const tempDir = path.join(__dirname, '../temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  return path.join(tempDir, `${videoId}.mp3`);
}

// 비디오 ID 검증 강화 (악의적인 명령어 주입 방지)
function extractVideoId(url) {
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.hostname === 'youtu.be') {
      const videoId = parsedUrl.pathname.substring(1);
      // 영숫자와 특정 문자만 허용 (명령어 주입 방지)
      if (!/^[a-zA-Z0-9_-]+$/.test(videoId)) {
        throw new Error('유효하지 않은 비디오 ID 형식');
      }
      return videoId;
    } else if (parsedUrl.searchParams.has('v')) {
      const videoId = parsedUrl.searchParams.get('v');
      // 영숫자와 특정 문자만 허용 (명령어 주입 방지)
      if (!/^[a-zA-Z0-9_-]+$/.test(videoId)) {
        throw new Error('유효하지 않은 비디오 ID 형식');
      }
      return videoId;
    }
    throw new Error('YouTube 비디오 ID를 추출할 수 없습니다.');
  } catch (error) {
    console.error('비디오 ID 추출 실패:', error.message);
    throw new Error('YouTube 비디오 ID를 추출할 수 없습니다: ' + error.message);
  }
}

async function playAudio(voiceChannel, youtubeUrl) {
  try {
    // YouTube URL 검증 및 정규화
    const validatedUrl = validateYoutubeUrl(youtubeUrl);
    console.log('검증된 YouTube URL:', validatedUrl);
    
    // 비디오 ID 추출
    const videoId = extractVideoId(validatedUrl);
    const outputPath = getTempFilePath(videoId);
    
    // 음성 채널 연결
    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: voiceChannel.guild.id,
      adapterCreator: voiceChannel.guild.voiceAdapterCreator,
      selfDeaf: false,
      selfMute: false
    });

    // 연결 상태 확인 및 대기
    try {
      await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
      console.log('음성 채널 연결 성공!');
    } catch (error) {
      console.error('음성 채널 연결 실패:', error);
      connection.destroy();
      throw error;
    }

    // 연결 상태 모니터링
    let connectionDestroyed = false;
    connection.on(VoiceConnectionStatus.Disconnected, () => {
      connectionDestroyed = true;
      console.log('음성 채널 연결이 끊어졌습니다.');
      try {
        connection.destroy();
      } catch (error) {
        console.log('연결 종료 중 오류:', error.message);
      }
    });
    connection.on(VoiceConnectionStatus.Destroyed, () => {
      connectionDestroyed = true;
      console.log('음성 채널 연결이 종료되었습니다.');
    });

    // 파일이 이미 존재하는지 확인
    if (!fs.existsSync(outputPath)) {
      console.log('YouTube 오디오 다운로드 시작...');
      
      try {
        // youtube-dl 명령어로 오디오 다운로드 (명령어 주입 방지)
        const sanitizedUrl = validatedUrl.replace(/[;&|`$()]/g, ''); // 특수 문자 제거
        const command = `yt-dlp -f 'ba' -x --audio-format mp3 --audio-quality 128K --max-filesize 10M "${sanitizedUrl}" -o "${outputPath}"`;
        await execAsync(command);
        console.log('YouTube 오디오 다운로드 완료!');
      } catch (error) {
        console.error('YouTube 오디오 다운로드 실패:', error.message);
        if (!connectionDestroyed) {
          connection.destroy();
        }
        throw new Error('오디오 다운로드 실패: ' + error.message);
      }
    } else {
      console.log('캐시된 오디오 파일 사용');
    }
    
    // 오디오 리소스 생성
    const resource = createAudioResource(fs.createReadStream(outputPath), {
      inputType: StreamType.Arbitrary,
      inlineVolume: true
    });
    
    // 볼륨 설정
    if (resource.volume) {
      resource.volume.setVolume(0.5);
    }

    const player = createAudioPlayer();
    
    // 플레이어 이벤트 리스너 설정
    player.on(AudioPlayerStatus.Playing, () => {
      console.log('오디오 재생 시작');
    });
    
    player.on(AudioPlayerStatus.Idle, () => {
      console.log('오디오 재생 완료');
      setTimeout(() => {
        if (!connectionDestroyed) {
          try {
            connection.destroy();
          } catch (error) {
            console.log('연결 종료 중 오류 (이미 종료됨):', error.message);
          }
        }
      }, 3000);
    });
    
    player.on('error', error => {
      console.error('오디오 재생 오류:', error);
      console.error('오류 세부 정보:', error.message);
      if (!connectionDestroyed) {
        try {
          connection.destroy();
        } catch (error) {
          console.log('연결 종료 중 오류 (이미 종료됨):', error.message);
        }
      }
    });

    // 리소스 재생
    player.play(resource);
    connection.subscribe(player);
    
    return player;
  } catch (error) {
    console.error('오디오 재생 중 오류 발생:', error);
    throw error;
  }
}

// 오래된 캐시 파일 정리 함수
function cleanupOldCacheFiles() {
  const tempDir = path.join(__dirname, '../temp');
  if (!fs.existsSync(tempDir)) return;
  
  const files = fs.readdirSync(tempDir);
  const now = Date.now();
  
  files.forEach(file => {
    const filePath = path.join(tempDir, file);
    const stats = fs.statSync(filePath);
    const fileAge = now - stats.mtimeMs;
    
    // 7일 이상 된 파일 삭제 (604800000ms = 7일)
    if (fileAge > 604800000) {
      fs.unlinkSync(filePath);
      console.log(`오래된 캐시 파일 삭제: ${file}`);
    }
  });
}

// 주기적으로 캐시 정리 (24시간마다)
setInterval(cleanupOldCacheFiles, 86400000);

module.exports = { playAudio, validateYoutubeUrl }; 