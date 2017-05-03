'use strict'

const request = require('request')
const Conf_ville = require('./config_ville')

var knex = require('knex')({
  client: 'mysql',
  connection: {
    host : 'xxxxx',
    user : 'xxxxxxx',
    password : 'xxxxxxx',
    database : Conf_ville.database
  }
});

function add_favori (id_user, id_station) {
	return new Promise(function(resolve, reject) {

		//SELECT * FROM favoris_velov WHERE id_user = ? AND id_station = ?
		knex('favoris').where({
		    id_user: id_user,
		    id_station: id_station
		}).then(function(resp1) { 
		
			// Si le favori n'existe pas
			if (resp1.length == 0)
			{
				// INSERT INTO favoris_velov(id_user, id_station) VALUES(?, ?)
				knex('favoris').insert({
					id_user: id_user,
			    	id_station: id_station
				}).then(function(r) {
					resolve({id: id_user, id: id_station, result: 'favori_created'});
				})
			}
			else {
				resolve({id: id_user, id: id_station, result: 'favori_exists'});
			}
		});
	})
}

function delete_favori (id_user, id_station) {
	return new Promise(function(resolve, reject) {

	  	// SELECT * FROM favoris_velov WHERE id_user = ? AND id_station = ?
	  	knex('favoris').where({
		    id_user: id_user,
		    id_station: id_station
		}).then(function(resp1) { 
		
			// Si le favori existe 
			if (resp1.length != 0)
			{
				// DELETE FROM favoris_velov WHERE id_user = ? AND id_station = ?
				knex('favoris').where({
					id_user: id_user,
			    	id_station: id_station
				}).del()
				.then(function(r) {
					resolve({id: id_user, id: id_station, result: 'favori_deleted'});
				})
			}
			else {
				resolve({id: id_user, id: id_station, result: 'favori_dont_exists'});
			}
		});

	  	
	})
}

function get_favoris_user (id_user) {
	return new Promise(function(resolve, reject) {

	  	// SELECT * FROM favoris_velov WHERE id_user = ?
	  	knex('favoris').where({
		    id_user: id_user
		}).then(function(resp) { 
		
			// Si il y a au moins un favori
			if (resp.length > 0)
			{
				var resultat = [];

				for(var i = 0 ; i < resp.length ; i++) {
					resultat.push({id : resp[i].id, id_user : resp[i].id_user , id_station : resp[i].id_station})
				}
				resolve({id: id_user, result: resultat})
			}
			else {
				resolve({id: id_user, result: 'no_favoris'})
			}
		});
	})
}

// Pas fini
function existence_favori(id_user, id_station) {
	return new Promise(function(resolve, reject) {
		request('http://xxxxxxxxxxxxxxxxxxxx.php?id_user='+id_user+'&id_station='+id_station, function (error, response, body) {
		    if (!error && response.statusCode == 200) {

		    	if(body == 'favori_exists')
		    	{
		    		resolve(true);
		    	}
		    	if(body == 'favori_dont_exists')
		    	{
		    		resolve(false);
		    	}
		    	else reject(false);
		    }
		    else reject(false);
	  	})
	})
}

module.exports = {
	add_favori: add_favori,
	delete_favori: delete_favori,
	get_favoris_user: get_favoris_user
}