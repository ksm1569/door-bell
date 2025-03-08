const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const clientId = process.env.CLIENT_ID || (fs.existsSync('./config.json') ? require('./config.json').clientId : null);
const token = process.env.TOKEN || (fs.existsSync('./config.json') ? require('./config.json').token : null);

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  if ('data' in command && 'execute' in command) {
    commands.push(command.data.toJSON());
  } else {
    console.log(`[경고] ${filePath} 명령어에 필요한 "data" 또는 "execute" 속성이 없습니다.`);
  }
}

const rest = new REST().setToken(token);

(async () => {
  try {
    console.log(`${commands.length}개의 글로벌 명령어를 등록하는 중...`);

    // 글로벌 명령어 등록 (모든 서버에 적용)
    const data = await rest.put(
      Routes.applicationCommands(clientId),
      { body: commands },
    );

    console.log(`${data.length}개의 글로벌 명령어가 성공적으로 등록되었습니다.`);
  } catch (error) {
    console.error(error);
  }
})(); 