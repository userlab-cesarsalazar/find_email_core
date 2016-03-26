Core para sistema de consultas de correo

Archivos a editar para el funcionamiento:
/app/dbConfig.js:
	contiene la información sobre la conexión a la base de datos en mongo
/app/core.js
	funciones de validación de correo solo se exporta la funcion "peticion".
/routes 

/*
funcionamiento de la ruta
llamar via post servername/buscar
eviar un json con formato parecido a este ejemplo

{
   "nombre": "cesar",     // requerido
    "apellido":"salazar", // opcional, no se si lo manejes con un solo field o 2 
    "dominio": "kipo.co", // requerido
    "userType": "paid"  // paid o guest requerido
    
}

una prueba corre actualmente en http://homezerox.all.my:300/buscar por post
(no garantizo que este siempre arriba, pero me dices y lo pongo a correr)

*/

adicional se debe crear en la db 2 registros 

UserConfig
userType	rebootTime:time(hh:mm:ss) waitTime:time maxSearchs 
guest		02:00:00				   00:00:30	 		10
paid		00:00:00				   00:00:00			0	

/* squema de UserConfig
var userConfigSchema = new mongoose.Schema({
    userType:{type:String, index: {unique: true, dropDups: true }},
    rebootTime: String,
    waitTime: String,
    maxSearch: Number,
        
});
**/