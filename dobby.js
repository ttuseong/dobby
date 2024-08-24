const _google = require('./ServiceClient/Google.js');

const { Client, GatewayIntentBits, Partials } = require('discord.js');
const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
    partials: [Partials.Channel],
});

const { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ButtonBuilder, ButtonStyle, Events } = require('discord.js');
const config  = require('./config.json');

async function InsertMemberData(nickname, gender, birthYear)
{
  const googleSheetClient = await _google.GetGoogleSheetClient();
  const memberIndexs = await _google.GetMemberIndexs(googleSheetClient);
  const currentIndexSize = memberIndexs == undefined ? 0 : memberIndexs.flat().length;

  // index
  await _google.Append(googleSheetClient, "no", currentIndexSize, (currentIndexSize + 1).toString());

  // NickName
  await _google.Append(googleSheetClient, "nickname", currentIndexSize, nickname);

  //gender
  await _google.Append(googleSheetClient, "gender", currentIndexSize, gender);

  //position
  await _google.Append(googleSheetClient, "birth", currentIndexSize, birthYear);

  //rolw
  await _google.Append(googleSheetClient, "position", currentIndexSize, "신입");

  //date
  const today = new Date();
  await _google.Append(googleSheetClient, "entrydate", currentIndexSize, `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`); // 현재 날짜로 변경 필요
}

client.once(Events.ClientReady, readyClient => {
	console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

client.on('ready', async () => {
    const channel = client.channels.cache.get(config.newbieRoleChannelId);

    const message = await channel.send({
        content: '```안녕하세요! 이전에 안내 드린 대로 간단한 자기소개 작성 부탁드립니다. \n'
          + '* 성별 / 출생년도 작성하신 후 기다려 주세요!  \n'
          + '(2003년 포함 그 이전 출생자로만 운영되는 서버입니다. ) \n'
          + '확인 후 신입 역할을 지급 해 드리겠습니다. \n'
          + '개인정보는 역할 지급 후 즉시 삭제해드리며, 신입 역할을 받으시면 서버 활동을 하실수 있습니다. \n'
          + '잘 부탁 드립니다 :)```',
        components: [new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('startSurvey')
                .setLabel('설문 시작')
                .setStyle(ButtonStyle.Primary)
        )],
    });
});

client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isButton()) return;

    if (interaction.customId === 'startSurvey') {
        const modal = new ModalBuilder()
            .setCustomId('surveyModal')
            .setTitle('설문 조사');

        const genderInput = new TextInputBuilder()
            .setCustomId('genderInput')
            .setLabel('성별을 입력해주세요 (남/여)')
            .setStyle(TextInputStyle.Short);

        const birthInput = new TextInputBuilder()
          .setCustomId('birthYearInput')
          .setLabel('출생년도를 입력해주세요 (1995)')
          .setStyle(TextInputStyle.Short);

        const secondActionRow = new ActionRowBuilder().addComponents(genderInput);
        const thirdActionRow = new ActionRowBuilder().addComponents(birthInput);

        modal.addComponents(secondActionRow, thirdActionRow);

        await interaction.showModal(modal);
    }
});

client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isModalSubmit()) return;

    if (interaction.customId === 'surveyModal') {
        await interaction.reply({ content: '설문 처리를 진행 중입니다...', ephemeral: true });

        const gender = interaction.fields.getTextInputValue('genderInput').trim();
        let birthYear = interaction.fields.getTextInputValue('birthYearInput').trim();

        if (gender != '남' && gender != '여' && gender != '남자' && gender != "여자")
          return interaction.editReply({ content: '입력하신 성별이 올바르지 않습니다.', ephemeral: true });

        birthYear = parseInt(birthYear, 10);

        if (isNaN(birthYear) || !Number.isInteger(birthYear) || birthYear.toString().length != 4 || birthYear < 1900)
          return interaction.editReply({ content: '입력하신 출생년도가 올바르지 않습니다.', ephemeral: true });


        if (birthYear >= 2003)
          return interaction.editReply({ content: '관리자 또는 운영진 맨션 부탁드립니다.', ephemeral: true });

        await InsertMemberData(interaction.member.displayName, gender, birthYear.toString());

        const member = interaction.member;
        const role = interaction.guild.roles.cache.get(config.newbieRoleId);
        const waitingMemberRole = interaction.guild.roles.cache.get(config.waitingMemberRoleId);

        try
        {
          if (role && member && waitingMemberRole) {
            await member.roles.add(role);

            await member.roles.remove(waitingMemberRole);

            const mainChatingChannel = interaction.guild.channels.cache.get(config.mainChatingChannelId);

            if (mainChatingChannel)
            {
              await mainChatingChannel.send(`${member} 어서오세요! 자기소개 게시판에도 양식에 맞게 소개작성 부탁드리겠습니다~`);
            }
            else
              return interaction.editReply({ content: '[에러 케이스 1]관리자 또는 운영진 맨션 부탁드립니다.', ephemeral: true });

          } else {
              return interaction.editReply({ content: '[에러 케이스 2]관리자 또는 운영진 맨션 부탁드립니다.', ephemeral: true });
          }
        }
        catch (error)
        {
            console.error('Error handling interaction:', error);
            return interaction.editReply({ content: '[에러 케이스 3]관리자 또는 운영진 맨션 부탁드립니다.', ephemeral: true });
        }
    }
});


client.login(config.token);
