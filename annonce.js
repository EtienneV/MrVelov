'use strict'

const Conv = require('./conversation')
const Users = require('./users')
const async = require('async')
const Conf_ville = require('./config_ville')

var knex = require('knex')({
  client: 'mysql',
  connection: {
    host : 'xxxxx',
    user : 'xxxxxx',
    password : 'xxxxxxx',
    database : Conf_ville.database
  }
});

function message_annonce (id_user) {

	Users.infos_user(id_user).then(function(i_user){ 	
   
   		var e_feminin = "";
   		if(i_user.gender == "male") e_feminin = ""
   		else if(i_user.gender == "female") e_feminin = "e"
   		else e_feminin = ""

		Conv.sendTextMessage(id_user, "Salut "+i_user.first_name+" !\nT'es-tu déjà demandé"+e_feminin+" quelles sont les stations Vélo'v les plus populaires ? 😁");

		var a_url_img = "http://xxxxxxx.png";
		var a_item_url = "http://bit.ly/2clmQgp"
		var a_elements = [];

		a_elements.push({"title": "Carte interactive",
		                          "image_url": a_url_img,
		                          "item_url": a_item_url
		                         });

		Conv.sendGenericMessage(id_user, a_elements).then(function (res) {}, function (err) {})
	})
}

function sondage (id_user) {
	Users.infos_user(id_user).then(function(i_user){ 	

		//Conv.sendTextMessage(id_user, "Bonjour "+i_user.first_name+" ! :)\nEst-ce que tu pourrais m'indiquer comment tu trouves mon service ?");

		Conv.sendQuickReplies(id_user, "Bonjour "+i_user.first_name+" ! :)\nComment trouves-tu mes services ?", [{
                                        "content_type":"text",
                                        "title": "Très utiles !",
                                        "payload": JSON.stringify({
                                                    request: 'sondage',
                                                    response: 'tres_utile'
                                                    })
                                    },
                                    {
                                        "content_type":"text",
                                        "title": "Inutiles",
                                        "payload": JSON.stringify({
                                                    request: 'sondage',
                                                    response: 'inutile'
                                                    })
                                    },
                                    {
                                        "content_type":"text",
                                        "title": "Ça ne marche pas :(",
                                        "payload": JSON.stringify({
                                                    request: 'sondage',
                                                    response: 'marche_pas'
                                                    })
                                    }])
	})
}

function sondage_response (id_user, response) {
	console.log("REPONSE SONDAGE : "+id_user+" "+response);

	Conv.sendTextMessage(id_user, "Merci beaucoup pour ce retour ! Ecris-moi un petit commentaire lorsque tu en as envie ! :)").then(function(sender){
		Conv.sendTextMessage(sender, "Et puis n'hésite pas à parler de moi à tes amis, ils pourraient avoir besoin de mes services ;)").then(function(sender){
			Conv.shareButton(sender, "Mr Vélo'v", // Titre
				"Demande-lui de te prévenir dès qu'un Vélo'v arrive à la station la plus proche ! ;)", // Sous-titre
				"https://scontent-cdg2-1.xx.fbcdn.net/v/t1.0-9/13645298_172887406450182_5392380788721536856_n.png?oh=76021f56a6f0e1615a9c5b1ecb42bc8b&oe=592B44F0", // Image
				"m.me/MrVelov") // Lien
		});
	});

	knex('sondage').insert({
		    id_user: id_user,
		    reponse: response
		}).then(function(resp1) {
			console.log("OK")
		});
}

function annonce_allusers () {

	Users.get_all_users().then(function (res) {
		//var all_users = JSON.parse(res)
		var all_users = res;

		console.log(all_users.length+' utilisateurs')

		// Enregistrement du nb d'users
		knex('sondage').insert({
		    id_user: 0,
		    reponse: all_users.length
		}).then(function(resp1) {
			console.log("OK")
		});


		var interval = 1 * 1000; // 3 seconds;

		for (var i = 0; i <=all_users.length-1; i++) {
		    setTimeout( function (i) {
		    	console.log(i+" : "+all_users[i].id_user)
		    	sondage (all_users[i].id_user)
		    }, interval * i, i);
		}
	});

}

module.exports = {
	annonce_allusers: annonce_allusers,
	sondage: sondage,
	sondage_response: sondage_response
};