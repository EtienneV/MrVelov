'use strict'

const request = require('request')
const async = require('async')
const Conf_ville = require('./config_ville')

var knex = require('knex')({
  client: 'mysql',
  connection: {
    host : 'xxxxxx',
    user : 'xxxxxxx',
    password : 'xxxxxx',
    database : Conf_ville.database
  }
});


String.prototype.sansAccent = function(){
    var accent = [
        /[\300-\306]/g, /[\340-\346]/g, // A, a
        /[\310-\313]/g, /[\350-\353]/g, // E, e
        /[\314-\317]/g, /[\354-\357]/g, // I, i
        /[\322-\330]/g, /[\362-\370]/g, // O, o
        /[\331-\334]/g, /[\371-\374]/g, // U, u
        /[\321]/g, /[\361]/g, // N, n
        /[\307]/g, /[\347]/g, // C, c
    ];
    var noaccent = ['A','a','E','e','I','i','O','o','U','u','N','n','C','c'];
     
    var str = this;
    for(var i = 0; i < accent.length; i++){
        str = str.replace(accent[i], noaccent[i]);
    }
     
    return str;
}


function infos_user (id_user) {
	return new Promise(function(resolve, reject) {
		//console.log('Test user : '+id_user)

		request('https://graph.facebook.com/v2.6/'+id_user+'?fields=first_name,last_name,profile_pic,locale,timezone,gender&access_token='+Conf_ville.token_messenger, function (error, response, body) { // On récupère les infos vélov
		    if (!error && response.statusCode == 200) {
		    	var infos_user = JSON.parse(body);

		    	//console.log(infos_user.first_name)

		    	infos_user.id_user = id_user;

		    	resolve(infos_user)
		    }
		    else
		    {
		    	reject(error)
		    }
	  })
	})
} 



function new_user(id_user) {
	return new Promise(function(resolve, reject) {
		console.log('Test user : '+id_user)

	  	// SELECT * FROM users WHERE id_user = ?
	  	knex('users').where({
		    id_user: id_user
		}).then(function(resp1) { 
		
			// Si l'utilisateur n'existe pas
			if (resp1.length == 0)
			{
				console.log('nouvel user !!')

				// INSERT INTO users(id_user) VALUES(?) 
				knex('users').insert({
					id_user: id_user
				}).then(function(r) {
					resolve({id: id_user, result: 'new_user'});
				})
			}
			else {
				console.log('vieil user !!')
				resolve({id: id_user, result: 'old_user'});
			}
		});
	})
}

function get_all_users() {
	return new Promise(function(resolve, reject) {
		//console.log('Test user : '+id_user)

		var resultat = [];

		console.log('get all users')

	  	// SELECT * FROM users
	  	knex.select().table('users')
	  	.then(function(resp) { 
		
			for(var i = 0 ; i < resp.length ; i++) {
				resultat.push({id : resp[i].id, id_user : resp[i].id_user})
			}
			//console.log(resultat)
			resolve(resultat)
		});
	})
}

function update_user(id_user, nom, prenom, sexe) {
	return new Promise(function(resolve, reject) {

	  	// UPDATE users SET prenom=?, nom=?, sexe=? WHERE id_user=?
	  	knex('users').where('id_user', id_user)
	  	.update({
		  prenom: prenom,
		  nom: nom,
		  sexe: sexe
		})
	  	.then(function(resp) { 
	  		resolve('done');
	  	});
	})
}

function maj_users () {

	get_all_users().then(function (all_users) {
		//var all_users = res

		//console.log('users recuperes')

		console.log(all_users.length+' utilisateurs')

		var i = 0;

		// parcours des utilisateurs de façon synchrone
		async.whilst(function () {
		  return i <= all_users.length;
		},
		function (next) {

			infos_user(all_users[i].id_user).then(function(i_user){
				 	//Conv.sendTextMessage(10209480368824248,i_user.first_name)
				 	console.log(i_user.id_user+' : '+i_user.first_name)
				 	//res.send(i_user.id_user+' : '+i_user.first_name)

				 	update_user(i_user.id_user, i_user.last_name, i_user.first_name, i_user.gender)

				 	i++; next();
				}, function (err) {
					console.log(err)
					i++; next();
				})
		},
		function (err) {
		  // All things are done!
		});
	});

}

module.exports = {
	new_user: new_user,
	infos_user: infos_user,
	get_all_users: get_all_users,
	update_user: update_user,
	maj_users: maj_users
}