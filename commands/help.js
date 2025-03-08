const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('도움말')
    .setDescription('DoorBell 봇 사용법을 안내합니다.'),
  
  async execute(interaction) {
    const helpEmbed = new EmbedBuilder()
      .setColor(0x0099FF)
      .setTitle('DoorBell 봇 도움말')
      .setDescription('음성 채널 입장/퇴장 시 사운드와 메시지를 재생하는 봇입니다.')
      .addFields(
        { name: '/입장설정', value: '사용자의 입장 사운드와 메시지를 설정합니다. (관리자 전용)' },
        { name: '/퇴장설정', value: '사용자의 퇴장 사운드와 메시지를 설정합니다. (관리자 전용)' },
        { name: '/도움말', value: '이 도움말을 표시합니다.' }
      )
      .setFooter({ text: '모든 설정 명령어는 서버 관리자만 사용할 수 있습니다.' });
    
    await interaction.reply({ embeds: [helpEmbed] });
  },
}; 