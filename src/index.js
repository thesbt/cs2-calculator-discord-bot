require("dotenv").config();
const {
  Client,
  IntentsBitField,
  REST,
  Routes,
  ApplicationCommandOptionType,
  ButtonBuilder,
  ButtonStyle,
  ActivityType,
} = require("discord.js");

const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
  ],
});

const commands = [
  {
    name: "exp",
    description: "Calculate how much you need to play to level up.",
    options: [
      {
        name: "experience",
        description: "Enter your current XP amount.",
        type: ApplicationCommandOptionType.Number,
        required: true,
      },
    ],
  },

  {
    name: "boosthelp",
    description: "❔ How CS2 Weekly Boost System Works",
  },
];

const rest = new REST({
  version: "10",
}).setToken(process.env.TOKEN);

let commandId = 0;

async function sendMatchTypeButtons(interaction) {
  const matchTypeButtons = [
    [
      new ButtonBuilder()
        .setCustomId("comp")
        .setLabel("Competitive / Premier")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("◼️"),
      new ButtonBuilder()
        .setCustomId("wingman")
        .setLabel("Wingman")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("◼️"),
    ],
    [
      new ButtonBuilder()
        .setCustomId("dm")
        .setLabel("Deathmatch / Arms Race")
        .setEmoji("◻️")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("casu")
        .setLabel("Casual")
        .setEmoji("◻️")
        .setStyle(ButtonStyle.Primary),
    ],
  ];

  const rows = matchTypeButtons.map((buttons) => {
    return {
      type: 1,
      components: buttons,
    };
  });

  await interaction.reply({
    content: "*Step 1:* \n 👇 **Select a game mode** 👇",
    ephemeral: true,
    components: rows,
  });
}

async function sendBoostButtons(interaction) {
  if (interaction.user.id !== commandId) {
    await interaction.reply({
      content: "**❕ You need to use /exp command again.**",
      ephemeral: true,
    });

    return;
  }
  const boostButtons = [
    [
      new ButtonBuilder()
        .setCustomId("boost-count-1")
        .setLabel("1x")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("🟢"),
      new ButtonBuilder()
        .setCustomId("boost-count-2")
        .setLabel("2x")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("🟡"),
      new ButtonBuilder()
        .setCustomId("boost-count-4")
        .setLabel("4x")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("🔴"),
    ],
  ];

  const rows = boostButtons.map((buttons) => {
    return {
      type: 1,
      components: buttons,
    };
  });

  await interaction.reply({
    content: `*Step 2:* \n 👇 **Select your Weekly XP Bonus** 👇 \n *(If you don't know how weekly XP bonus system works, type **/boosthelp**)*`,
    ephemeral: true,
    components: rows,
  });
}

(async () => {
  console.log("Registering slash commands...");

  await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), {
    body: commands,
  });

  console.log("Successfully registered slash commands.");

  client.on("ready", () => {
    console.log(`Logged in as ${client.user.tag}`);

    client.user.setActivity({
      type: ActivityType.Custom,
      name: "🧮 Calculating...",
      state: "🧮 Calculating... ",
    });
  });

  let experience;
  let matchType;

  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isCommand() && !interaction.isButton()) return;
    if (interaction.isCommand()) {
      if (interaction.commandName === "boosthelp") {
        const user = interaction.user;
        const message =
          "# **How Weekly XP Bonus System Works in CS2** 👇 \n 👉 If you **didn't level up** after weekly reset, You have **4x** XP Bonus. 👈\n 👉 If you level up **once** after weekly reset, You have **2x** XP Bonus. 👈 \n 👉 If you level up **twice** after weekly reset, You have **1x** XP Bonus. 👈 \n\n\n 🕘 **CS2 Weekly Reset Times** 🕘 \n\n *5:00pm to 6:00pm PT (Pasific Time) on every Tuesday.* \n *02:00 to 03:00 CEST (European Time) on every Wednesday.* \n *03:00 to 04:00 TSİ (Turkish Time) on every Wednesday.* \n\n 👇 **You can use our bot on Web** 👇 \n\n 🌐 [Here is our Website](https://exp.thesbt.site)";

        try {
          await user.send(message);
          await interaction.reply({
            content: `I have sent you a DM about how Weekly XP Bonus system works.`,
            ephemeral: true,
          });
        } catch (error) {
          await interaction.reply(
            "I couldn't send you a DM. Please make sure your DMs are open."
          );
        }
      }
      commandId = interaction.user.id;
      if (interaction.commandName === "exp") {
        experience = interaction.options.getNumber("experience");
        experience >= 0 && experience < 5000
          ? await sendMatchTypeButtons(interaction)
          : interaction.reply({
              content: `❌ Current XP amount must be between 0 an 5000`,
              ephemeral: true,
            });
      }
    } else if (interaction.isButton()) {
      if (
        interaction.customId === "dm" ||
        interaction.customId === "comp" ||
        interaction.customId === "casu" ||
        interaction.customId === "wingman"
      ) {
        matchType = {
          type: {
            dm: "Deathmatch / Arms Race",
            comp: "Competitive / Premier",
            casu: "Casual",
            wingman: "Wingman",
          }[interaction.customId],
          point: {
            dm: "points",
            comp: "rounds",
            casu: "scores",
            wingman: "rounds",
          }[interaction.customId],
        };
        await sendBoostButtons(interaction);
      } else if (interaction.customId.startsWith("boost-count-")) {
        if (interaction.user.id !== commandId) {
          await interaction.reply({
            content: "**❕ You need to use /exp command again.**",
            ephemeral: true,
          });

          return;
        }
        const boostCount = parseInt(
          interaction.customId.replace("boost-count-", "")
        );
        const result = calculateResult(experience, matchType.type, boostCount);
        await interaction.reply({
          content: `✅ *Success* \n Your current XP is **${experience}**. You can level up by getting **${result}** **${matchType.point}** in **${matchType.type}** game mode, with **${boostCount}x** weekly xp bonus.`,
          ephemeral: true,
        });
      }
    }
  });

  await client.login(process.env.TOKEN);
})();

function calculateResult(experience, matchType, boostCount) {
  const xpNeeded = 5000;
  const matchTypeFactors = {
    "Deathmatch / Arms Race": 0.2,
    "Competitive / Premier": 30,
    Casual: 4,
    Wingman: 15,
  };
  const factor = matchTypeFactors[matchType] || 1;

  const roundsNeeded = Math.ceil(
    (xpNeeded - experience) / (factor * boostCount)
  );
  return roundsNeeded;
}
