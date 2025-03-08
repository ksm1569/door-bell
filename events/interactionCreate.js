const { Events } = require('discord.js');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
      console.error(`${interaction.commandName} 명령어를 찾을 수 없습니다.`);
      return;
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(error);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: '명령어 실행 중 오류가 발생했습니다!', ephemeral: true });
      } else {
        await interaction.reply({ content: '명령어 실행 중 오류가 발생했습니다!', ephemeral: true });
      }
    }
  }
}; 