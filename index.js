require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const mongoose = require("mongoose");
const Usuario = require("./models/Usuario");

// Conexión a MongoDB (usa .env si está, si no local)
const uri = process.env.MONGODB_URI && process.env.MONGODB_URI.trim() !== ""
  ? process.env.MONGODB_URI
  : "mongodb://127.0.0.1:27017/chatbotdb";

mongoose.connect(uri)
  .then(() => console.log("MongoDB conectado"))
  .catch(err => console.log("❌", err));

// Inicia bot
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error("Pon TELEGRAM_BOT_TOKEN en .env");
  process.exit(1);
}
const bot = new TelegramBot(token, { polling: true });


const sesiones = {};

// helpers
function tecladoMenu() {
  return {
    reply_markup: {
      inline_keyboard: [
        [{ text: "Ver usuarios", callback_data: "menu_ver" }, { text: "Crear usuario", callback_data: "menu_crear" }],
        [{ text: "Estado", callback_data: "menu_estado" }, { text: "Ayuda", callback_data: "menu_ayuda" }]
      ]
    }
  };
}

function listarUsuariosTexto(usuarios) {
  if (!usuarios || usuarios.length === 0) return "No hay usuarios registrados.";
  let r = "🧑‍🤝‍🧑 *Usuarios:*\n\n";
  usuarios.forEach(u => {
    r += `• ${u._id}  — *${u.nombre}* (${u.email || "sin email"})\n`;
  });
  return r;
}

//Comandos basicos

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const texto = `🤖 HELOUDA! Soy tu bot samu. Escribe /ayuda o usa /menu para ver opciones.`;
  bot.sendMessage(chatId, texto);
});

bot.onText(/\/ayuda/, (msg) => {
  const chatId = msg.chat.id;
  const ayuda = `
📌 *Comandos disponibles:*
/menu - Abre el menú
/usuarios - Lista usuarios (máx 20)
/crear <nombre> <email?> - Crea usuario rápido
/crear - Crear usuario paso a paso
/editar - Editar usuario paso a paso
/borrar <id?> - Borrar usuario (por id o paso a paso)
/estado - Ver estado del servidor
/seed - volver a poblar DB con datos de prueba (si eres developer)
  `;
  bot.sendMessage(chatId, ayuda, { parse_mode: "Markdown" });
});

//menu
bot.onText(/\/menu/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, "Selecciona una opción:", tecladoMenu());
});

bot.on("callback_query", async (callbackQuery) => {
  const data = callbackQuery.data;
  const chatId = callbackQuery.message.chat.id;
  const msgId = callbackQuery.message.message_id;

  if (data === "menu_ver") {
    try {
      const usuarios = await Usuario.find().sort({ creadoEn: -1 }).limit(20);
      bot.sendMessage(chatId, listarUsuariosTexto(usuarios), { parse_mode: "Markdown" });
    } catch {
      bot.sendMessage(chatId, "Error obteniendo usuarios.");
    }
  }

  if (data === "menu_crear") {
    sesiones[chatId] = { paso: "crear_nombre" };
    bot.sendMessage(chatId, "Ingresa el *nombre* del usuario:", { parse_mode: "Markdown" });
  }

  if (data === "menu_estado") {
    const uptime = Math.round(process.uptime());
    const memoria = (process.memoryUsage().rss / 1024 / 1024).toFixed(2);
    bot.sendMessage(chatId, `⏱ Uptime: ${uptime}s\n💾 Memoria: ${memoria} MB`);
  }

  if (data === "menu_ayuda") {
    bot.sendMessage(chatId, "Escribe /ayuda para ver comandos y ayuda detallada.");
  }

  // importante: responder el callback para quitar "loading" en Telegram
  bot.answerCallbackQuery(callbackQuery.id);
});

//usuarios y listar
bot.onText(/\/usuarios/, async (msg) => {
  const chatId = msg.chat.id;
  const usuarios = await Usuario.find().sort({ creadoEn: -1 }).limit(20);
  bot.sendMessage(chatId, listarUsuariosTexto(usuarios), { parse_mode: "Markdown" });
});

//crear quick y email
bot.onText(/\/crear (.+) (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const nombre = match[1].trim();
  const email = match[2].trim();

  try {
    const nuevo = new Usuario({ nombre, email });
    await nuevo.save();
    bot.sendMessage(chatId, `Usuario creado con exito: *${nombre}* (${email})`, { parse_mode: "Markdown" });
  } catch (err) {
    bot.sendMessage(chatId, "Parece que hubo una ❌ creando usuario.");
  }
});

//crear 
bot.onText(/\/crear$/, (msg) => {
  const chatId = msg.chat.id;
  sesiones[chatId] = { paso: "crear_nombre" };
  bot.sendMessage(chatId, "Ingresa el *nombre* del usuario:", { parse_mode: "Markdown" });
});

/* ---------------------------
   /editar interactive
   - /editar inicia proceso
   - pedimos id -> nombre -> email -> guardamos
----------------------------*/
bot.onText(/\/editar$/, (msg) => {
  const chatId = msg.chat.id;
  sesiones[chatId] = { paso: "editar_pedir_id" };
  bot.sendMessage(chatId, "Ingresa el *ID* del usuario que quieres editar (si puedes copiarlo de usuarios facilmente) :", { parse_mode: "Markdown" });
});

/* ---------------------------
   /borrar quick o interactive
   - /borrar <id> borra directamente
   - /borrar inicia proceso paso a paso
----------------------------*/
bot.onText(/\/borrar (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const id = match[1].trim();
  try {
    const res = await Usuario.findByIdAndDelete(id);
    if (res) {
      bot.sendMessage(chatId, `Usuario eliminado: *${res.nombre}*`, { parse_mode: "Markdown" });
    } else {
      bot.sendMessage(chatId, "No se encontró usuario con ese ID.");
    }
  } catch {
    bot.sendMessage(chatId, "Error eliminando usuario. Revisa el ID.");
  }
});

bot.onText(/\/borrar$/, (msg) => {
  const chatId = msg.chat.id;
  sesiones[chatId] = { paso: "borrar_pedir_id" };
  bot.sendMessage(chatId, "Ingresa el *ID* del usuario a borrar (o usa /usuarios para ver ids):", { parse_mode: "Markdown" });
});

//estado
bot.onText(/\/estado/, (msg) => {
  const chatId = msg.chat.id;
  const uptime = Math.round(process.uptime());
  const memoria = (process.memoryUsage().rss / 1024 / 1024).toFixed(2);
  bot.sendMessage(chatId, `⏱ Uptime: ${uptime}s\n💾 Memoria: ${memoria} MB`);
});

//comandos para repoblar el seed (solo para el developer)
bot.onText(/\/seed/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    await Usuario.deleteMany();
    await Usuario.insertMany([
    { nombre: "Samuel Puerto", email: "samuelpuerto066@gmail.com" },
      { nombre: "Jonathan Bernal", email: "jonathanbernal@gmail.com" },
      { nombre: "Daniel Mahecha", email: "mahechadaniel@gmail.com" }
    ]);
    bot.sendMessage(chatId, "🌱 DB repoblada con datos de ejemplo.");
  } catch (err) {
    bot.sendMessage(chatId, "❌ Error ejecutando seed.");
  }
});

/* ---------------------------
   Mensajes libres: manejamos sesiones paso a paso
----------------------------*/
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const texto = (msg.text || "").trim();

  // ignorar comandos (ya manejados)
  if (texto.startsWith("/")) return;

  const ses = sesiones[chatId];
  if (!ses) return;

  // Crear: pedir nombre -> pedir email -> guardar
  if (ses.paso === "crear_nombre") {
    ses.nombre = texto;
    ses.paso = "crear_email";
    return bot.sendMessage(chatId, "Ahora ingresa el *email* (o escribe '-' si no tienes):", { parse_mode: "Markdown" });
  }

  if (ses.paso === "crear_email") {
    const nombre = ses.nombre;
    const email = texto === "-" ? "" : texto;
    try {
      await Usuario.create({ nombre, email });
      bot.sendMessage(chatId, `Usuario creado: *${nombre}* (${email || "sin email"})`, { parse_mode: "Markdown" });
    } catch {
      bot.sendMessage(chatId, "Error creando usuario.");
    }
    delete sesiones[chatId];
    return;
  }

  // Editar: pedir id -> pedir nuevo nombre -> pedir nuevo email -> guardar
  if (ses.paso === "editar_pedir_id") {
    ses.editId = texto;
    ses.paso = "editar_nombre";
    return bot.sendMessage(chatId, "Ingresa el *nuevo nombre* (o escribe '-' para mantener):", { parse_mode: "Markdown" });
  }

  if (ses.paso === "editar_nombre") {
    ses.newNombre = texto;
    ses.paso = "editar_email";
    return bot.sendMessage(chatId, "Ingresa el *nuevo email* (o '-' para mantener):", { parse_mode: "Markdown" });
  }

  if (ses.paso === "editar_email") {
    const id = ses.editId;
    const upd = {};
    if (ses.newNombre !== "-") upd.nombre = ses.newNombre;
    if (texto !== "-") upd.email = texto;

    try {
      const updated = await Usuario.findByIdAndUpdate(id, upd, { new: true });
      if (!updated) {
        bot.sendMessage(chatId, "No se ha encontrado usuarios con ese ID.");
      } else {
        bot.sendMessage(chatId, `Actualizado correctamente:\n*${updated.nombre}* (${updated.email})`, { parse_mode: "Markdown" });
      }
    } catch (err) {
      bot.sendMessage(chatId, "Error actualizando usuario. Revisa el ID.");
    }
    delete sesiones[chatId];
    return;
  }

  // Borrar: pedir id -> borrar
  if (ses.paso === "borrar_pedir_id") {
    const id = texto;
    try {
      const res = await Usuario.findByIdAndDelete(id);
      if (res) bot.sendMessage(chatId, `Usuario eliminado: *${res.nombre}*`, { parse_mode: "Markdown" });
      else bot.sendMessage(chatId, "No se encontró usuario con ese ID.");
    } catch {
      bot.sendMessage(chatId, "Error borrando usuario.");
    }
    delete sesiones[chatId];
    return;
  }

});
