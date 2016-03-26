/**
* archivo de configuración de la base de datos
* modificar la informacion de la conexión en función del server
*/

// configuracion de conexion  a la bd
var dbDir="mongodb://localhost/correodb";

var mongoose = require('mongoose'),
    Schema = mongoose.Schema;
 
var ConsultasDetalleSchema = new Schema({
    nombre: String,
    apellido: String,
    dominio: String,
    correo: String,
    fechaConsulta: Date,
    arrayPos: Number

});
ConsultasDetalleSchema.index({nombre:1, apellido:1, dominio:1 }, {unique: true});

var MaestroConsultaSchema = new Schema({
    userType: String,
    IPAddress: {type:String, index: {unique: true, dropDups: true }},
    ultimaConsulta: Date,
    search: Number
        
});


var userConfigSchema = new mongoose.Schema({
    userType:{type:String, index: {unique: true, dropDups: true }},
    rebootTime: String,
    waitTime: String,
    maxSearch: Number,
        
});
 
/*mongoose.model('ConsultasDetalle', ConsultasDetalleSchema);
mongoose.model('MaestroConsulta', MaestroConsultaSchema);
mongoose.model('UserConfig', userConfigSchema);*/
mongoose.connect(dbDir);
module.exports = {
    db: mongoose,
    UserConfig: mongoose.model('UserConfig', userConfigSchema),
    MaestroConsulta: mongoose.model('MaestroConsulta', MaestroConsultaSchema),
    ConsultasDetalle: mongoose.model('ConsultasDetalle', ConsultasDetalleSchema)
} 
