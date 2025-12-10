const mongoose = require("mongoose");

const UsuarioSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  email: { type: String, default: "" },
  role: { type: String, enum: ["user", "admin"], default: "user" },
  creadoEn: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Usuario", UsuarioSchema);
