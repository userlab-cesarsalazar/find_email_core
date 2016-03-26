var express = require('express');
var router = express.Router();
var core = require('../app/core');


/* GET home page. */
router.get('/', function(req, res, next) {
	res.render('index', { title: 'Express' });
});

router.get('/buscar/:nombre/:apellido/:dominio', function(req, res, next) {

	core.peticion('guest',req.ip,req.params.nombre,req.params.apellido,req.params.dominio,res,next);
});

router.post('/buscar', function(req, res, next) {
	core.peticion('guest',req.ip,req.params.nombre,req.params.apellido,req.params.dominio,res,next);
});



module.exports = router;
