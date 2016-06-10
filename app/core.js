var array = [".", "_"]; // caracteres con los que generan los correos, añadir o quitar a gusto
var _ = require("underscore");
var db = require("../app/dbConfig"); // base de datos utiliza mongoose

/*
*	variables de control y salida
*/
var controller = {accesoPermitido:false,resultadoPositivo:false, userType:'guest', ipOrigen:'', correoValido:'',consultasRestantes:0,waitTime:'00:00:00',error:"",errCode:0 ,diasRestantes:0}
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
 	apellido = apellido||"";
 	dominio = dominio.replace("@", "");
 	caracteresEsp.unshift("");
 	

 	salida.push(nombre + "@" + dominio);
 	if (apellido.length>0) {
 		salida.push(apellido + "@" + dominio);
 	}

 	var tamCarEps = caracteresEsp.length
 	
 	if (apellido.length>0 && nombre.length>0){
 		for (var i = 0; i < tamCarEps; i++) {
 			salida.push(nombre.charAt(0) + caracteresEsp[i] + apellido + "@" + dominio);
 			salida.push(apellido.charAt(0) + caracteresEsp[i] + nombre + "@" + dominio);
 		}
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
		console.log("verificando...");
		var verifier = require('email-verify');
		verifier.verify(lista[pos], function(err, info) {
			if (err) {
				console.log("emailverifuerror:"+err);
 			band=3;//error de servidor
 			controller.resultadoPositivo=false;
 			controller.error="Connection Refused by Server";
 			controller.errCode=1;
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
			controller.errCode=2
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
					errCode=9

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
			//console.log("llego aqui");
			buscarCorreoValido(salida, 0, res);

		} 
	});	
	controller.resultadoPositivo=true;





}

/*
*  Función de origen al Core, por aqui se comienza a buscar, 
*  se genera la lista de correos y hace el llamado a donde se validan las credenciales 
*/
function peticion(userType,ip,nombre2,apellido2,dominio2,elBody,res,next) {
	
	// body...
	var tipoUsr="guest";
	nombre=normalize(nombre2).toLowerCase();
	apellido=normalize(apellido2).toLowerCase();
	dominio=normalize(dominio2).toLowerCase();
	controller.accesoPermitido=false;
	controller.resultadoPositivo=false;
	controller.error="";
	controller.errCode=0;
	controller.correoValido="";
	controller.diasRestantes=0;
	salida=[];
	generar(nombre,apellido,dominio,array);
	//console.log(salida);

	db.Users.findOne({ mail: elBody.usermail ,customerId:elBody.userid , fechaValido : {$gte: new Date()}}, function(err,data1){
		if (err){
			console.log(err);
			tipoUsr = "guest";
			//acceso(tipoUsr,ip,res);
		}else{
			if (data1!=null){
				//res.json({consultasRestantes:"-1", waitTime:"00:00:00"});
				tipoUsr="paid";
				var moment= require('moment');
				var fechaValido = moment(data1.fechaValido);
				var today= moment(new Date());
				controller.diasRestantes=fechaValido.diff(today,'days');
				//console.log("datos de consulta: " + data1);
				acceso(tipoUsr,ip,res);

			}else {
				tipoUsr="guest";
				acceso(tipoUsr,ip,res);
			}
		}
	});

	

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
				else{			
					if (data != null && data.IPAddress == ip){
						if (data.search< data1.maxSearch){
							//console.log(data);
							var fecha = new Date();
							var fechaUltimoAcceso= data.ultimaConsulta;
							var tiempoTranscurrido=(fecha.getTime()-fechaUltimoAcceso.getTime());
							var rebootTime=1000*(data1.rebootTime.split(':')[0]*3600+data1.rebootTime.split(':')[1]*60+data1.rebootTime.split(':')[2]);
							if ((fecha.getTime()-fechaUltimoAcceso.getTime())>rebootTime){
								db.MaestroConsulta.update({IPAddress:ip},{search: 1,ultimaConsulta: new Date() } ,{multi:true}, function(err,rowupdates){
									
								});
								controller.consultasRestantes=data1.maxSearch - (1);

							}else {

								db.MaestroConsulta.update({IPAddress:ip},{search: data.search+1,ultimaConsulta: new Date() } ,{multi:true}, function(err,rowupdates){
									buscarCorreoBD(res);
								//console.log('rowupdates:'+ rowupdates);

							});
								controller.consultasRestantes=data1.maxSearch - (data.search+1);

							}
							controller.accesoPermitido = true;
							controller.waitTime='00:00:00';

							
							
						}else{
							var fecha = new Date();
							var fechaUltimoAcceso= data.ultimaConsulta;
							//console.log(data);
							//console.log(data1);
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
								controller.waitTime = (tiempo.getHours())+":"+(tiempo.getMinutes())+":"+tiempo.getSeconds();
								controller.error="maxSearch exceeded";
								controller.errCode=3;

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
								controller.errCode=9;
								res.json(controller);
							}else{
								buscarCorreoBD(res);

							}


						});



					}
				}
			});


	});

}

function consultasDisponibles(elBody,ip,res,next){
	

	controller.ipOrigen = ip;
	controller.userType = elBody.userType||"guest";
	
	db.Users.findOne({ mail: elBody.usermail ,customerId:elBody.userid , fechaValido : {$gte: new Date()}}, function(err,data1){
		if (err){
			console.log(err);
			controller.userType = "guest";
		}else{
			if (data1!=null){
				var moment= require('moment');
				var fechaValido = moment(data1.fechaValido);
				var today= moment(new Date());
				res.json({consultasRestantes:"-1", waitTime:"00:00:00", diasRestantes:fechaValido.diff(today,'days')});
				
				console.log("datos de consulta: " + data1);

			}else {

				db.UserConfig.findOne({userType:controller.userType}, function(err,data1){
					if (err)
						console.log(err);
					else
						db.MaestroConsulta.findOne({IPAddress:ip, userType:controller.userType},function (err,data){
							if (err)
								console.log(err);
							else
								if (data != null && data.IPAddress == ip){
									if (data.search< data1.maxSearch){

										try{
											res.json({consultasRestantes:data1.maxSearch-data.search, waitTime:"00:00:00", diasRestantes:0});
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
												res.json({consultasRestantes:data1.maxSearch, waitTime:"00:00:00",diasRestantes:0});
											}catch(e){
												res.end;
												console.log(e);
												console.log(e.stack);
											}
										}else {
											var tiempo=new Date(waitTime - tiempoTranscurrido);



											try{
												res.json({consultasRestantes:0,waitTime:(tiempo.getHours())+":"+(tiempo.getMinutes())+":"+tiempo.getSeconds()});


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
										res.json({consultasRestantes:data1.maxSearch, waitTime: "00:00:00", diasRestantes:0})
									}catch(e){
										res.end;
										console.log(e);
										console.log(e.stack);
									}



								}
							});


				});


			} 
			
		}


	});	

	

}
/**
* funcion para realizar el cobro
*/

function realizarCobro(elBody, res,next ){
	var stripe = require("stripe")("sk_test_BQokikJOvBiI2HlWgH4olfQ2");

	// (Assuming you're using express - expressjs.com)
	// Get the credit card details submitted by the form
	var stripeToken = elBody.stripeToken||elBody.token.id;
	var mail = elBody.stripeEmail||elBody.token.email;
	console.log(stripeToken);
	//se valida que no exista un usario sin vencerse para ese correo en la base de datos para no cobrar 2 veces...
	//
	console.log(mail);
	db.Users.findOne({ mail: mail ,fechaValido : {$gte: new Date()}}, function(err,data1){
		if (err){
			console.log(err);
			res.json({pagoAprobado:false,error:err.message});
		}else{
			if (data1!=null){
				res.json({pagoAprobado:false,error:"Correo registrado con tiempo disponible en el  servicio ilimitado"});
				return;
				console.log("datos de consulta: " + data1);

			}else {

				var charge = stripe.charges.create({
				  amount: 1000, // amount in cents, again
				  currency: "usd",
				  source: stripeToken,
				  description: "Example charge"
				}, function(err, charge) {
					if (err ){
						res.json({pagoAprobado:false,error:err.message});
						console.log("error de cobro" +err);
					
				  
				}else{
					var today= new Date();
					var vence= new Date();
					vence.setDate(vence.getDate()+30);
					db.Users.create ({mail:mail,customerId:stripeToken, fechaValido:vence ,fechaRegistro:today, cardLast4:elBody.token.card.last4}, function (err, data){
						if (err){
							console.error(err);
							res.json({pagoAprobado:false,error:err.message});

						}else{
							console.log("registro creado");
							//console.log(data);
							enviarCorreoCobro(elBody,res,next);
						}
					});

				}
			});

			} 
			
		}


	});



}

function enviarCorreoCobro(token,res,next){
	//console.log(token);
	var nodemailer = require('nodemailer');
	var email = token.stripeEmail||token.token.email;
	var stripeToken = token.stripeToken||token.token.id;
// create reusable transporter object using the default SMTP transport
var fs = require('fs');
var html ="";
fs.readFile('mailTemplate/bienvenida.html', 'utf8', function(err, file){
	if(err){
	      //handle errors
	      console.log('ERROR!');
	      res.json({pagoAprobado:false,error:error.message});
	  }
	  else {
	  	html=file;
	  	html=html.replace('$ADDRESS$','http://www.cualessucorreo.com/usuariosPagos?userid='+stripeToken+'&usermail='+email);
	  	html=html.replace('$NOMBRE$', email);
	  	var smtpConfig = {
	  		  service: "Gmail",
	  	//	host: 'www.cualessucorreo.com',
	  	//	port: 465,
		//    secure: true, // use SSL
		    auth: {
		    	user: "info@cualessucorreo.com",
		    	pass: "superfacil20"
		    }

		};
		
	  	var transporter = nodemailer.createTransport(smtpConfig);//usar directcConfig o smtpConfig // para gmail ->'smtps://usuario@gmail.com:pass@smtp.gmail.com'

// setup e-mail data with unicode symbols
var mailOptions = {
    from: '"Cual es Su Correo " <info@cualessucorreo.com>', // sender address
    to: email, // list of receivers
    subject: 'Bienvenido a Cual es su Correo', // Subject line
    text: 'Bienvenido al mejor sistema de consulta de correos en la web. \n\n A través del siguiente enlace podra acceder a su cuenta  y disfrutar de nuestro servicio ilimitado por 30 días continuos\n\n http://www.cualessucorreo.com/usuariosPagos?userid='+stripeToken+'&usermail='+email, // plaintext body
    


    html:html
    // '<b>Bienvenido al mejor sistema de consulta de correos en la web. <br />  <br />A través del siguiente enlace podra acceder a su cuenta  y disfrutar de nuestro servicio ilimitado por 30 días continuos<br /> <br /> <a href="http://www.cualessucorreo.com/usuariosPagos?userid='+stripeToken+'&usermail='+email+'" >http://www.cualessucorreo.com/usuariosPagos </a> </b>' // html body
};

// send mail with defined transport object
transporter.sendMail(mailOptions, function(error, info){
	if(error){
		console.log(error);
		res.json({pagoAprobado:false,error:error.message});
	}else
	{
		console.log('Message sent: ' + info.response);
		res.json({pagoAprobado:true,error:"", link:'http://www.cualessucorreo.com/usuariosPagos?userid='+stripeToken+'&usermail='+email});
	}
});
}
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
exports.realizarCobro = realizarCobro;

