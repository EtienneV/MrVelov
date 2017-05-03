'use strict'

const favoris = require('./favoris')
const Conv = require('./conversation')
const Velov = require('./velov')
const Utils = require('./utils')
const Conf_ville = require('./config_ville')

function add_favori (id_user, id_station) {
	favoris.add_favori(id_user, id_station).then(function(result) {
		if(result.result == 'favori_created')
		{
			Conv.sendTextMessage(id_user, "J'ai ajouté cette station à tes favoris")
		}
		else if(result.result == 'favori_exists')
		{
			Conv.sendTextMessage(id_user, 'Cette station est déjà dans tes favoris !')
		}
		else Conv.sendTextMessage(id_user, "Une erreur s'est produite ... :/")
	}, function(result) {
		Conv.sendTextMessage(id_user, "Une erreur s'est produite ... :/")
	})
}

function delete_favori (id_user, id_station) {
	favoris.delete_favori(id_user, id_station).then(function(result) {
		if(result.result == 'favori_deleted')
		{
			Conv.sendTextMessage(id_user, "J'ai retiré cette station de tes favoris")
		}
		else if(result.result == 'favori_dont_exists')
		{
			Conv.sendTextMessage(id_user, "Cette station n'est pas dans tes favoris !")
		}
		else Conv.sendTextMessage(id_user, "Une erreur s'est produite ... :/")
	}, function(result) {
		Conv.sendTextMessage(id_user, "Une erreur s'est produite ... :/")
	})
}

function afficher_favoris (id_user) {
	var message = []

	favoris.get_favoris_user(id_user).then(function(result) {
		if(result.result == 'no_favoris')
		{
			Conv.sendTextMessage(id_user, 'Aucun favoris !')
		}
		else
		{
			for(var i = 0 ; i < result.result.length ; i++) {
				var infos_station = Velov.findStation(result.result[i].id_station); // Recherche des infos de la station en question

				var url_img = "https://maps.googleapis.com/maps/api/staticmap?maptype=roadmap&size=573x300"+
            			"&markers=color:red%7Clabel:V%7C"+infos_station.latitude+","+infos_station.longitude+
            			"&key="+Conf_ville.googleAPIS_client;

          		var item_url = "http://maps.google.com/?q="+infos_station.latitude+","+infos_station.longitude;

				message.push({"title": Utils.miseEnFormeNom(infos_station.name),
						"image_url": url_img,
                        "item_url": item_url,
						"subtitle": "🚲 "+ infos_station.free_bikes + " "+Conf_ville.nom_velo+ "\n" + 
									"🏁 " + infos_station.empty_slots + " places"+ "\n" + 
									Utils.convertTimestamp(infos_station.extra.last_update),
		                "buttons": [{
			                "type": "postback",
			                "title": "Supprimer",
			                "payload": JSON.stringify({
			                            context: 'favoris',
			                            request: 'delete_favori',
			                            id_station: infos_station.extra.uid
			                    }) 
			                }]
		                })
			}

			if(message.length != 0)
			{
				Conv.sendTextMessage(id_user, "Voici tes stations favorites")
				Conv.sendGenericMessage(id_user, message)
			}
			else { // Aucune station de suivie
				Conv.sendTextMessage(id_user, "Tu n'as aucune station favorite !")
			}
		}
	}, function(result) {
		Conv.sendTextMessage(id_user, "Une erreur s'est produite ... :/")
	});
}


module.exports = {
	add_favori: add_favori,
	delete_favori: delete_favori,
	afficher_favoris: afficher_favoris
}