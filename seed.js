const mongoose = require("mongoose");
const Usuario = require("./models/Usuario");

mongoose.connect("mongodb://127.0.0.1:27017/chatbotdb")
  .then(() => console.log("📌 MongoDB conectado (seed)"))
  .catch(err => console.log("❌ Error:", err));

async function ejecutarSeed() {
  try {
    await Usuario.deleteMany();

    await Usuario.insertMany([
      { nombre: "Samuel Puerto", email: "samuelpuero066@gmail.com" },
      { nombre: "Jonathan Portuguez", email: "jonathan77@gmail.com" },
      { nombre: "Daniel Mahecha", email: "mahecha709@gmail.com" }
    ]);

    console.log("🌱 Datos insertados correctamente");
  } catch (err) {
    console.log("❌ Error en el seed:", err);
  } finally {
    mongoose.connection.close();
  }
}

ejecutarSeed();
