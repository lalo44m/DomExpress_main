const mongoose = require("mongoose");
const citasSchema = mongoose.Schema({
  user: {
    type: String,
    require: true
  },
  numeroTel: {
    type: String,
    require: true
  },
  Asunto: {
    type: String,
    require: true
  },
  fechaRegistro: {
    type: Date,
    default: Date.now(),
    require: true
  },
  FechaAtendida: {
    type: String
  },
  Atendida: {
    type: Boolean
  },
  CostoFinal: {
    type: Number
  },
  Atendio: {
    type: String,
  },
});


const Citas = new mongoose.model("citas", citasSchema);
module.exports = Citas;
