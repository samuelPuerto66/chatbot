require("dotenv").config();
const mongoose = require("mongoose");
const Usuario = require("./models/Usuario");

const uri = process.env.MONGODB_URI && process.env.MONGODB_URI.trim() !== ""
  ? process.env.MONGODB_URI
  : "mongodb://127.0.0.1:27017/chatbotdb";

async function main() {
  try {
    await mongoose.connect(uri);
    console.log("MongoDB conectado");

    await Usuario.deleteMany();

    await Usuario.insertMany([
      { nombre: "Samuel Puerto", email: "samuelpuerto066@gmail.com" },
      { nombre: "Jonathan Bernal", email: "jonathanbernal@gmail.com" },
      { nombre: "Daniel Mahecha", email: "mahechadaniel@gmail.com" }
    ]);

    console.log("Datos insertados correctamente");
  } catch (err) {
    console.error("❌", err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

main();
