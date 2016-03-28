var array = [".", "_"]; // caracteres con los que generan los correos, añadir o quitar a gusto
var _ = require("underscore");
var db = require("../app/dbConfig"); // base de datos utiliza mongoose

/*
*	variables de control y salida
*/
var controller = {accesoPermitido:false,resultadoPositivo:false, userType:'guest', ipOrigen:'', correoValido:'',consultasRestantes:0,waitTime:'00:00:00',error:"" }
var salida= [];
var nombre="";
var apellido="";
var dominio="";
var band=0;


/**
 * Función que genera la lista de correos que sera procesada
 *
 */
 function generar(nombre2, apellido2, dominio2, caracteresEsp2) {
 	//var salida = [];

 	nombre=nombre2;
 	apellido=apellido2;
 	dominio=dominio2;
 	caracteresEsp=caracteresEsp2 || array;
 	nombre = nombre.trim();
 	apellido = apellido.trim();

 	if (apellido.length == 0) {

 		apellido = nombre.split(" ")[1];
 		nombre = nombre.split(" ")[0];
 	}
 	
 	dominio = dominio.replace("@", "");
 	caracteresEsp.unshift("");


 	salida.push(nombre + "@" + dominio);
 	salida.push(apellido + "@" + dominio);
 	var tamCarEps = caracteresEsp.length;

 	for (var i = 0; i < tamCarEps; i++) {
 		salida.push(nombre.charAt(0) + caracteresEsp[i] + apellido + "@" + dominio);
 		salida.push(apellido.charAt(0) + caracteresEsp[i] + nombre + "@" + dominio);
 	}
 	for (var i = 0; i < tamCarEps; i++) {
 		for (var j = nombre.length; j > 1; j--) {
 			salida.push(nombre.substring(0, j) + caracteresEsp[i] + apellido + "@" + dominio);
 		}
 		for (var j = apellido.length; j > 1; j--){
 			salida.push(apellido.substring(0, j) + caracteresEsp[i] + nombre + "@" + dominio);
 		}
 	}

 }

/**
*	
*	Función que verifica recursivamente los elementos de la correo generada en la anterior funcion 
*   y los valida. si consigue uno correo, se detiene y envia ese resultado, tambien lo almacena en la bd
**/
function verificarCorreoSMTPRecursiva(lista,pos,res) {
	if (lista.length>pos && band==0){

		var verifier = require('email-verify');
		verifier.verify(lista[pos], function(err, info) {
			if (err) {
 			band=3;//error de servidor
 			controller.resultadoPositivo=false;
 			controller.error="Connection Refused by Server";
 			try{
 				res.json(controller);
 			}catch(e){
 				res.end;
 				console.log(e);
 				console.log(e.stack);
 			}
 			console.log(err);
            //return false;
        }
        else {
        	if  (info.success){
        		console.log("Success (T/F): " + info.success);
        		console.log("Info: " + info.info);
        		band=1;
        		controller.resultadoPositivo=true;
        		controller.correoValido=lista[pos];
        		db.ConsultasDetalle.create({nombre:nombre,apellido:apellido,dominio:dominio,correo:lista[pos],fechaConsulta: new Date(), arrayPos:pos}, 
        			function(err,data){ 
        				if (err)   					{
        					console.error(err);
        				}
        				else {
        					//console.log(data);
        				}
        			});
        		try{
        			res.json(controller);
        		}catch(e){
        			res.end;
        			console.log(e);
        			console.log(e.stack);
        		}
        	}   else{
        		console.log("Success (T/F): " + info.success);
        		console.log("Info: " + info.info);
        		verificarCorreoSMTPRecursiva(lista,pos+1,res);
				//res.send( {"correo":correo, "success":false});	

			}

		}

	});

	}else {
		if (band==0){
			controller.resultadoPositivo=false;
			controller.error="Mail Not Found";
			try{
				res.json(controller);
			}catch(e){
				res.end;
				console.log(e);
				console.log(e.stack);
			}
		}

	}


}

/**
* Funcion por conveniencia, para llamar a  verificarCorreoSMTPRecursiva
*/
function buscarCorreoValido(listaCorreo, iniciarEn, res) {

	band = 0;
	verificarCorreoSMTPRecursiva(listaCorreo,0,res);

}

/**
*  Funcion que valida que esa consulta no haya generado un resultado previo en la bd, 
*  primero se busca aqui luego es que se verifica contra la lista de correos generada
*  en caso de encontrarse en la bd se responde con la data de alla y se actualiza la fecha 
*  de la ultima consulta. Si no se llama a buscarCorreoValido. 
*/
function buscarCorreoBD(res){
	console.log (nombre+apellido+dominio);
	
	db.ConsultasDetalle.findOne({nombre:nombre, apellido:apellido, dominio:dominio },function (err,data){
		if (err)
			console.log(err);
		else
			//console.log (data);
		if (data != null){
			//console.log(data);
			controller.resultadoPositivo = true;
			controller.correoValido= data.correo;
			db.ConsultasDetalle.update({nombre:nombre, apellido:apellido, dominio:dominio },{fechaConsulta: new Date() } ,{multi:true}, function(err,rowupdates){
				if (err){
					controller.error=err;

				}else{

					try{
						res.json(controller);


					}catch(e){
						res.end;
						console.log(e);
						console.log(e.stack);
					}
				}


			});
		}else {
			buscarCorreoValido(salida, 0, res);

		} 
	});	
	controller.resultadoPositivo=true;





}

/*
*  Función de origen al Core, por aqui se comienza a buscar, 
*  se genera la lista de correos y hace el llamado a donde se validan las credenciales 
*/
function peticion(userType,ip,nombre2,apellido2,dominio2,res,next) {
	
	// body...
	nombre=normalize(nombre2).toLowerCase();
	apellido=normalize(apellido2).toLowerCase();
	dominio=normalize(dominio2).toLowerCase();
	controller.accesoPermitido=false;
	controller.resultadoPositivo=false;
	controller.error="";
	controller.correoValido="";
	salida=[];
	generar(nombre,apellido,dominio,array);
	acceso(userType,ip,res);

}


/**
* Se valida el acceso de este ip a la pagina, en caso de ser bloqueado se niega el acceso, 
* y se retorna el tiempo para volver a consultar.
* en caso de permitirse el acceso, se llama a la función buscarCorreoBd
**/
function acceso(userType,ip,res,next){

	controller.ipOrigen = ip;
	controller.userType = userType;
	

	db.UserConfig.findOne({userType:userType}, function(err,data1){
		if (err)
			console.log(err);
		else
			db.MaestroConsulta.findOne({IPAddress:ip, userType:userType},function (err,data){
				if (err)
					console.log(err);
				else
					if (data != null && data.IPAddress == ip){
						if (data.search< data1.maxSearch){

							var fecha = new Date();
							var fechaUltimoAcceso= data.ultimaConsulta;
							var tiempoTranscurrido=(fecha.getTime()-fechaUltimoAcceso.getTime());
							var rebootTime=1000*(data1.rebootTime.split(':')[0]*3600+data1.rebootTime.split(':')[1]*60+data1.rebootTime.split(':')[2]);
							controller.accesoPermitido = true;
							controller.waitTime='00:00:00';

							db.MaestroConsulta.update({IPAddress:ip},{search: data.search+1,ultimaConsulta: new Date() } ,{multi:true}, function(err,rowupdates){
								buscarCorreoBD(res);
								//console.log('rowupdates:'+ rowupdates);

							});
							controller.consultasRestantes=data1.maxSearch - (data.search+1);

						}else{
							var fecha = new Date();
							var fechaUltimoAcceso= data.ultimaConsulta;

							var waitTime=1000*(data1.waitTime.split(':')[0]*3600+data1.waitTime.split(':')[1]*60+data1.waitTime.split(':')[2]);
							var tiempoTranscurrido=(fecha.getTime()-fechaUltimoAcceso.getTime());
							if ((fecha.getTime()-fechaUltimoAcceso.getTime())>waitTime){
								db.MaestroConsulta.update({IPAddress:ip},{search: 1,ultimaConsulta: new Date() } ,{multi:true}, function(err,rowupdates){
									
								});
								controller.accesoPermitido = true;
								controller.waitTime='00:00:00';
								controller.consultasRestantes=data1.maxSearch - (1);
								buscarCorreoBD(res);
							}else {
								var tiempo=new Date(waitTime - tiempoTranscurrido);

								controller.accesoPermitido=false;
								controller.waitTime = (tiempo.getHours()-19)+":"+(tiempo.getMinutes()-30)+":"+tiempo.getSeconds();
								controller.error="maxSearch exceeded";

								try{
									res.json(controller);


								}catch(e){
									res.end;
									console.log(e);
									console.log(e.stack);
								}

							}

						}
					}
					else {	
						controller.accesoPermitido = true;
						controller.waitTime='00:00:00';
						db.MaestroConsulta.create({userType: userType, IPAddress:ip, ultimaConsulta:new Date() ,search:1}, function(err, dat){
							if (err){
								console.error(err);
								controller.error=err.errmsg;
								res.json(controller);
							}else{
								buscarCorreoBD(res);

							}
							

						});

						

					}
				});


	});

}

function consultasDisponibles(userType,ip,res,next){

	controller.ipOrigen = ip;
	controller.userType = userType;
	

	db.UserConfig.findOne({userType:userType}, function(err,data1){
		if (err)
			console.log(err);
		else
			db.MaestroConsulta.findOne({IPAddress:ip, userType:userType},function (err,data){
				if (err)
					console.log(err);
				else
					if (data != null && data.IPAddress == ip){
						if (data.search< data1.maxSearch){

							try{
								res.json({consultasRestantes:data1.maxSearch-data.search, waitTime:"00:00:00"});
							}catch(e){
								res.end;
								console.log(e);
								console.log(e.stack);
							}
						}else{
							var fecha = new Date();
							var fechaUltimoAcceso= data.ultimaConsulta;

							var waitTime=1000*(data1.waitTime.split(':')[0]*3600+data1.waitTime.split(':')[1]*60+data1.waitTime.split(':')[2]);
							var tiempoTranscurrido=(fecha.getTime()-fechaUltimoAcceso.getTime());
							if ((fecha.getTime()-fechaUltimoAcceso.getTime())>waitTime){
								
								try{
									res.json({consultasRestantes:data1.maxSearch, waitTime:"00:00:00"});
								}catch(e){
									res.end;
									console.log(e);
									console.log(e.stack);
								}
							}else {
								var tiempo=new Date(waitTime - tiempoTranscurrido);

								

								try{
									res.json({consultasRestantes:0,waitTime:(tiempo.getHours()-19)+":"+(tiempo.getMinutes()-30)+":"+tiempo.getSeconds()});


								}catch(e){
									res.end;
									console.log(e);
									console.log(e.stack);
								}

							}

						}
					}
					else {							
						try{
							res.json({consultasRestantes:data1.maxSearch, waitTime: "00:00:00"})
						}catch(e){
							res.end;
							console.log(e);
							console.log(e.stack);
						}

						

					}
				});


	});

}

/**
* funcion que normaliza el texto, elimina tildes y Ñ y los sustituye
*/

var normalize = (function() {
  var from = "ÃÀÁÄÂÈÉËÊÌÍÏÎÒÓÖÔÙÚÜÛãàáäâèéëêìíïîòóöôùúüûÑñÇç", 
      to   = "AAAAAEEEEIIIIOOOOUUUUaaaaaeeeeiiiioooouuuunncc",
      mapping = {};
 
  for(var i = 0, j = from.length; i < j; i++ )
      mapping[ from.charAt( i ) ] = to.charAt( i );
 
  return function( str ) {
      var ret = [];
      for( var i = 0, j = str.length; i < j; i++ ) {
          var c = str.charAt( i );
          if( mapping.hasOwnProperty( str.charAt( i ) ) )
              ret.push( mapping[ c ] );
          else
              ret.push( c );
      }      
      return ret.join( '' );
  }
 
})();



/**
* solo me interesa exportar la peticion lo demas es privado del modulo
*
*/
exports.peticion = peticion;
exports.consultasDisponibles = consultasDisponibles;

