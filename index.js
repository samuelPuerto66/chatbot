require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const mongoose = require("mongoose");
const Usuario = require("./models/Usuario");
const sesiones = {}; // almacenamiento temporal por chat

// Conexión a MongoDB
mongoose.connect("mongodb://127.0.0.1:27017/chatbotdb")
  .then(() => console.log("❗ Conectado con Exito "))
  .catch(err => console.log("❌", err));

// INICIAR BOT
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, {
  polling: true,
});

// /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, "👋 Helouda! Soy tu bot samuel. Escribe /ayuda para ver mis demas comandos.");
});

// /ayuda
bot.onText(/\/ayuda/, (msg) => {
  const chatId = msg.chat.id;
  const ayuda = `
📌 *Comandos disponibles*:
🧑‍🤝‍🧑 /usuarios - Lista de usuarios
➕ /crear - Crear un nuevo usuario
💻 /estado - Ver estado del servidor
  `;
  bot.sendMessage(chatId, ayuda, { parse_mode: "Markdown" });
});

// /usuarios
bot.onText(/\/usuarios/, async (msg) => {
  const chatId = msg.chat.id;

  try {
    const usuarios = await Usuario.find().limit(10);

    if (usuarios.length === 0) {
      return bot.sendMessage(chatId, "😢 No hay usuarios.");
    }

    let respuesta = "*Usuarios registrados:*\n\n";
    usuarios.forEach(u => {
      respuesta += `• *${u.nombre}* (${u.email})\n`;
    });

    bot.sendMessage(chatId, respuesta, { parse_mode: "Markdown" });
  } catch {
    bot.sendMessage(chatId, "❌ Error.");
  }
});

// /estado
bot.onText(/\/estado/, (msg) => {
  const chatId = msg.chat.id;

  const uptime = process.uptime();
  const memoria = process.memoryUsage().rss / 1024 / 1024;

  const respuesta = `
🖥 *Estado del servidor*
⏱ Uptime: ${Math.round(uptime)} segundos
💾 Memoria usada: ${memoria.toFixed(2)} MB
  `;

  bot.sendMessage(chatId, respuesta, { parse_mode: "Markdown" });
});

// /crear Nombre Email
bot.onText(/\/crear (.+) (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;

  const nombre = match[1];
  const email = match[2];

  try {
    const nuevoUsuario = new Usuario({ nombre, email });
    await nuevoUsuario.save();

    bot.sendMessage(chatId, `✅ Usuario creado:\n Nombre: *${nombre}*\n📧 Email: *${email}*`, {
      parse_mode: "Markdown",
    });
  } catch (err) {
    bot.sendMessage(chatId, "❌.");
  }
});
bot.onText(/\/crear/, (msg) => {
  const chatId = msg.chat.id;

  sesiones[chatId] = { paso: 1 };
  bot.sendMessage(chatId, "Ingresa el *nombre* del usuario:", { parse_mode: "Markdown" });
});

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const texto = msg.text;

  // Si no está en proceso de creación, ignorar
  if (!sesiones[chatId]) return;

  // Paso 1: recibir nombre
  if (sesiones[chatId].paso === 1 && texto !== "/crear") {
    sesiones[chatId].nombre = texto;
    sesiones[chatId].paso = 2;

    return bot.sendMessage(chatId, "Perfecto. Ahora ingresa el *email* del usuario:", {
      parse_mode: "Markdown"
    });
  }

  // Paso 2: recibir email
  if (sesiones[chatId].paso === 2) {
    sesiones[chatId].email = texto;

    const { nombre, email } = sesiones[chatId];

    try {
      await Usuario.create({ nombre, email });

      bot.sendMessage(chatId, `✅ Usuario guardado:\n *${nombre}*\n📧 *${email}*`, {
        parse_mode: "Markdown"
      });

    } catch {
      bot.sendMessage(chatId, "❌ ");
    }

    delete sesiones[chatId]; 
  }
});
