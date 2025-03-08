const { Events } = require('discord.js');

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    console.log(`준비 완료! ${client.user.tag}으로 로그인했습니다.`);
  }
}; 