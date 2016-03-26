Core para sistema de consultas de correo

Archivos a editar para el funcionamiento:
/app/dbConfig.js:
	contiene la información sobre la conexión a la base de datos en mongo
/app/core.js
	funciones de validación de correo solo se exporta la funcion "peticion".
/routes 

/*
funcionamiento de la ruta
{
   "nombre": "cesar",     // requerido
    "apellido":"salazar", // opcional, no se si lo manejes con un solo field o 2 
    "dominio": "kipo.co", // requerido
    "userType": "paid"  // paid o guest
    
}
*/