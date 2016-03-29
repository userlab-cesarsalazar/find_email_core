var db = require("./app/dbConfig");

db.UserConfig.create ({userType:'guest',rebootTime:'02:00:00', waitTime:'00:00:30',maxSearch:10}, function (err, data){
	if (err){
		console.error(err);

	}else{
		console.log("registro creado");
		console.log(data);

	}
});

db.UserConfig.create ({userType:'paid',rebootTime:'00:00:00', waitTime:'00:00:00',maxSearch:0}, function (err, data){
	if (err){
		console.error(err);

	}else{
		console.log("registro creado");
		console.log(data);

	}
});