var express = require('express');
var router = express.Router();
var core = require('../app/core');
var bodyParser = require('body-parser');
var app = express();

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

/* GET home page. */
router.get('/', function(req, res, next) {
	res.render('index', { title: 'Express' });
});

router.get('/buscar/:nombre/:apellido/:dominio', function(req, res, next) {

	core.peticion('guest',req.ip,req.params.nombre,req.params.apellido,req.params.dominio,res,next);
});

router.post('/buscar', function(req, res, next) {
	
	if (req.body.apellido==null){
		nombres=req.body.nombre.trim().split(" ");
	if (nombres.length>1){		
 		req.body.apellido = nombres[1];
 		req.body.nombre = nombres[0];
 		}else{
 			req.body.apellido = "";
 			req.body.nombre=nombres[0];

 		}

	}
	core.peticion(req.body.userType,req.ip,req.body.nombre,req.body.apellido,req.body.dominio,res,next);
});



module.exports = router;
