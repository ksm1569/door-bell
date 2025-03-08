const { Events } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { playAudio } = require('../utils/audioPlayer');

module.exports = {
  name: Events.VoiceStateUpdate,
  async execute(oldState, newState) {
    // 봇은 무시
    if (newState.member.user.bot) return;

    const userId = newState.member.user.id;
    const userSettings = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/userSettings.json'), 'utf8'));
    
    // 사용자 설정이 없으면 무시
    if (!userSettings[userId]) return;

    // 입장 이벤트 (이전에 음성 채널에 없었고, 지금 음성 채널에 있는 경우)
    if (!oldState.channelId && newState.channelId) {
      const guildSettings = userSettings[userId][newState.guild.id];
      if (guildSettings && guildSettings.enterSound) {
        // 입장 메시지 전송
        if (guildSettings.enterMessage) {
          const channel = newState.guild.channels.cache.find(ch => ch.type === 0 && ch.permissionsFor(newState.guild.members.me).has('SendMessages'));
          if (channel) {
            channel.send(`${newState.member.displayName} ${guildSettings.enterMessage}`);
          }
        }
        
        // 입장 사운드 재생
        await playAudio(newState.channel, guildSettings.enterSound);
      }
    }
    
    // 퇴장 이벤트 (이전에 음성 채널에 있었고, 지금 음성 채널에 없는 경우)
    else if (oldState.channelId && !newState.channelId) {
      const guildSettings = userSettings[userId][oldState.guild.id];
      if (guildSettings && guildSettings.leaveSound) {
        // 퇴장 메시지 전송
        if (guildSettings.leaveMessage) {
          const channel = oldState.guild.channels.cache.find(ch => ch.type === 0 && ch.permissionsFor(oldState.guild.members.me).has('SendMessages'));
          if (channel) {
            channel.send(`${oldState.member.displayName} ${guildSettings.leaveMessage}`);
          }
        }
        
        // 퇴장 사운드 재생
        await playAudio(oldState.channel, guildSettings.leaveSound);
      }
    }
  }
}; 