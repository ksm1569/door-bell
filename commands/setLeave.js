const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { isAdmin } = require('../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('퇴장설정')
    .setDescription('사용자의 퇴장 사운드와 메시지를 설정합니다.')
    .addUserOption(option => 
      option.setName('사용자')
        .setDescription('설정할 사용자')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('사운드')
        .setDescription('유튜브 링크 (퇴장 사운드)')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('메시지')
        .setDescription('퇴장 메시지')
        .setRequired(false)),
  
  async execute(interaction) {
    // 관리자 권한 확인
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ content: '이 명령어는 관리자만 사용할 수 있습니다.', ephemeral: true });
    }
    
    const targetUser = interaction.options.getUser('사용자');
    const sound = interaction.options.getString('사운드');
    const message = interaction.options.getString('메시지') || '';
    
    // 유튜브 링크 유효성 검사
    if (!sound.includes('youtube.com') && !sound.includes('youtu.be')) {
      return interaction.reply({ content: '유효한 유튜브 링크를 입력해주세요.', ephemeral: true });
    }
    
    // 설정 저장
    const settingsPath = path.join(__dirname, '../data/userSettings.json');
    let userSettings = {};
    
    try {
      userSettings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    } catch (error) {
      // 파일이 없거나 잘못된 형식인 경우 새로 생성
      userSettings = {};
    }
    
    // 사용자 설정 초기화
    if (!userSettings[targetUser.id]) {
      userSettings[targetUser.id] = {};
    }
    
    // 서버별 설정 초기화
    if (!userSettings[targetUser.id][interaction.guild.id]) {
      userSettings[targetUser.id][interaction.guild.id] = {};
    }
    
    // 퇴장 설정 저장
    userSettings[targetUser.id][interaction.guild.id].leaveSound = sound;
    userSettings[targetUser.id][interaction.guild.id].leaveMessage = message;
    
    // 파일에 저장
    fs.writeFileSync(settingsPath, JSON.stringify(userSettings, null, 2));
    
    await interaction.reply({ 
      content: `${targetUser.username}의 퇴장 설정이 완료되었습니다.\n사운드: ${sound}${message ? `\n메시지: ${message}` : ''}`, 
      ephemeral: true 
    });
  },
}; 