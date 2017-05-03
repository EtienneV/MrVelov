'use strict'

const Velov = require('./velov')
const Utils = require('./utils')
const Conv = require('./conversation')
const crontab = require('node-crontab');
const Conf_ville = require('./config_ville')
var moment = require('moment');
moment.locale('fr');

var etat_stations = [];

var station_maisons_neuves = 8035;
var id_etienne = xxxxxxxxxxxx;
var stations_suivies = [10024, 10048, 10002];


var bdd_suivi = [];


function find_station_in_bdd(station) {
	return station.id == this;
}

function find_station_in_newTab(station) {
	return station.extra.uid == this;
}

function find_station_in_oldTab(station) {
	return station.id == this;
}

function find_user_in_station(user) {
	return user.id == this
}

// On indique si le bouton servira à chercher des places ou des vélo'v
function set_recherche_request(message, recherche) {
	var pl = JSON.parse(message[0].buttons[1].payload);
	pl.request = recherche;
	message[0].buttons[1].payload = JSON.stringify(pl);

	return message;
}

function station_est_surveillee(id_station, id_user) {
	var station = bdd_suivi.find(find_station_in_bdd, id_station);

	if(station !== undefined) { // Si la station est présente
		if(station.subscribers.find(find_user_in_station, id_user) !== undefined) { // Si l'user surveille cette station
			return true;
		}

	}

	return false;
}

// Timeout pour être sûr que le contrôlleur des vélov soir initialisé
setTimeout(function(){
	var tab_stations = Velov.get_stations();

	for(var i = 0 ; i < tab_stations.length ; i++) {
		etat_stations.push({
			id: tab_stations[i].extra.uid,
			velov: tab_stations[i].free_bikes,
			places: tab_stations[i].empty_slots
		})
	}

	crontab.scheduleJob("*/1 * * * *", function(){ //This will call this function every 1 minutes 
		var d = new Date();

		var tab_stations = Velov.get_stations();




		for(var i = 0 ; i < bdd_suivi.length ; i++) { // Pour chaque station suivie
			var act = tab_stations.find(find_station_in_newTab, bdd_suivi[i].id) // récupération de la valeur actuelle de cette station
			var prec = etat_stations.find(find_station_in_oldTab, bdd_suivi[i].id) // récupération de l'ancienne valeur de la station

			if((act !== undefined) && (prec !== undefined)) { // Si on a bien trouvé quelque chose
				if(prec.velov != act.free_bikes) { // Si le nb de velov a changé
					for(var j = 0 ; j < bdd_suivi[i].subscribers.length ; j++) { // Pour chaque subscriber

						var message = [{"title": "",
	                                    "buttons": [{
				                              "type": "postback",
				                              "title": "🔕 Stop",
				                              "payload": JSON.stringify({
				                                          context: 'suivi',
				                                          request: 'unsubscribe_station',
				                                          id_station: prec.id,
				                                          nom: Utils.miseEnFormeNom(act.name)
				                                          }) 
			                              },
			                              {
				                              	"type": "postback",
				                              	"title": "🔍 Chercher autour",
				                              	"payload": JSON.stringify({
				                                          	context: 'suivi',
				                                          	request: 'recherche_stations',
				                                          	id_station: prec.id,
				                                          	nom: Utils.miseEnFormeNom(act.name),
				                                          	gps: [act.longitude, act.latitude]
				                                          	}) 
			                              	}]
	                                }]



						if(act.free_bikes == 0){ // Plus de vélos
							message[0].title = "Il n'y a plus de "+Conf_ville.nom_velo+" à "+Utils.miseEnFormeNom(act.name)+" !";
							message = set_recherche_request(message, 'recherche_velo')
							Conv.sendGenericMessage(bdd_suivi[i].subscribers[j].id, message)
						}
						else if(act.empty_slots == 0){ // Plus de place
							message[0].title = "Il n'y a plus de place à "+Utils.miseEnFormeNom(act.name)+" !";
							message = set_recherche_request(message, 'recherche_place')
							Conv.sendGenericMessage(bdd_suivi[i].subscribers[j].id, message)
						}
						else if((act.free_bikes == 1) && (prec.velov == 0)) { // Si un vélo'v vient d'arriver
							message[0].title = "Un "+Conf_ville.nom_velo+" vient d'arriver à "+Utils.miseEnFormeNom(act.name)+" !";
							message = set_recherche_request(message, 'recherche_velo')
							Conv.sendGenericMessage(bdd_suivi[i].subscribers[j].id, message)
						}
						else if((act.empty_slots == 1) && (prec.places == 0)) { // Si une place vient de se libérer
							message[0].title = "Une place vient de se libérer à "+Utils.miseEnFormeNom(act.name)+" !";
							message = set_recherche_request(message, 'recherche_place')
							Conv.sendGenericMessage(bdd_suivi[i].subscribers[j].id, message)
						}
						// Moins de 3 Vélo'v
						else if((act.free_bikes <= 3) && (act.free_bikes < prec.velov)) {// Ca a baissé
							message[0].title = "Il n'y a plus que "+act.free_bikes+" "+Conf_ville.nom_velo+" à "+Utils.miseEnFormeNom(act.name)+" !";
							message = set_recherche_request(message, 'recherche_velo')
							Conv.sendGenericMessage(bdd_suivi[i].subscribers[j].id, message)
						}
						else if((act.free_bikes <= 3) && (act.free_bikes > prec.velov)) {// Ca a monté
							message[0].title = "Il y a "+act.free_bikes+" "+Conf_ville.nom_velo+" à "+Utils.miseEnFormeNom(act.name)+" !";
							message = set_recherche_request(message, 'recherche_velo')
							Conv.sendGenericMessage(bdd_suivi[i].subscribers[j].id, message)
						}
						// Moins de 3 places
						else if((act.empty_slots <= 3) && (act.empty_slots < prec.places)) {// Ca a baissé
							message[0].title = "Il n'y a plus que "+act.empty_slots+" places à "+Utils.miseEnFormeNom(act.name)+" !";
							message = set_recherche_request(message, 'recherche_place')
							Conv.sendGenericMessage(bdd_suivi[i].subscribers[j].id, message)
						}
						else if((act.empty_slots <= 3) && (act.empty_slots > prec.places)) {// Ca a monté
							message[0].title = "Il y a "+act.empty_slots+" places à "+Utils.miseEnFormeNom(act.name)+" !";
							message = set_recherche_request(message, 'recherche_place')
							Conv.sendGenericMessage(bdd_suivi[i].subscribers[j].id, message)
						}
					}
				}

				// Check des timeouts 
				for(var j = 0 ; j < bdd_suivi[i].subscribers.length ; j++) {
					// Check des timeouts 
					//if(Math.floor((bdd_suivi[i].subscribers[j].end - d.getTime() / 1000) / 60) < 0) // Lorsque le timeout est dépassé
					if(moment.unix(bdd_suivi[i].subscribers[j].end).diff(moment()) < 0) // END - NOW < 0 : timeout dépassé
					{
						//console.log('SUPRESSION STATION')
						// On retire la station des stations suivies
						bdd_suivi[i].subscribers.splice(bdd_suivi[i].subscribers.indexOf(bdd_suivi[i].subscribers.find(find_user_in_station, bdd_suivi[i].subscribers[j].id)), 1)
					}
				}
			}
		}

		etat_stations = [];

		for(var i = 0 ; i < tab_stations.length ; i++) {
			etat_stations.push({
				id: tab_stations[i].extra.uid,
				velov: tab_stations[i].free_bikes,
				places: tab_stations[i].empty_slots
			})
		}

		console.log("MAJ etat stations (suivi)")
	});

}, 3000);



function suivre_station(id_user, id_station, nom_station, duration) {
	var bdd_station = bdd_suivi.find(find_station_in_bdd, id_station);

	console.log(bdd_suivi)

	var message = [{"title": "",
		                "buttons": [{
			                "type": "postback",
			                "title": "🔕 Ne plus surveiller",
			                "payload": JSON.stringify({
			                            context: 'suivi',
			                            request: 'unsubscribe_station',
			                            id_station: id_station,
			                            nom: nom_station
			                    }) 
			                }]
		                }]

	if(bdd_station !== undefined) { // Si la station y est déjà

		if(bdd_station.subscribers.find(find_user_in_station, id_user) === undefined) { // Si on est pas déjà inscrit

			console.log(bdd_suivi)
			bdd_suivi[bdd_suivi.indexOf(bdd_station)].subscribers.push({id: id_user, end: moment().add(duration, 'm').unix()})
			console.log(bdd_suivi)

			message[0].title = "Ok, je vais surveiller la station "+nom_station;
			message[0].subtitle = "Pendant "+moment.duration(duration, 'minutes').humanize();
			Conv.sendGenericMessage(id_user, message)
			//Conv.sendTextMessage(id_etienne, "ok_already_in_tab")
			return 'ok'
		}
		else {
			// Mise à jour de la durée de surveillance
			//bdd_suivi[bdd_suivi.indexOf(bdd_station)].subscribers[bdd_suivi.subscribers.indexOf(bdd_suivi.subscribers.find(find_user_in_station, id_user))].end = moment().add(duration, 'm').unix();

			var index_station_courante = bdd_suivi.indexOf(bdd_station);
			var infos_user_station_courant = bdd_suivi[index_station_courante].subscribers.find(find_user_in_station, id_user);
			var index_user_courant = bdd_suivi[index_station_courante].subscribers.indexOf(infos_user_station_courant);
			bdd_suivi[index_station_courante].subscribers[index_user_courant].end = moment().add(duration, 'm').unix();

			message[0].title = "Ok, je vais surveiller la station "+nom_station+" !";
			message[0].subtitle = "Pendant "+moment.duration(duration, 'minutes').humanize()+"";
			Conv.sendGenericMessage(id_user, message)
			//Conv.sendTextMessage(id_etienne, "already_subscribed")
			return 'already_subscribed'
		}
	}
	else { // Sinon, on crée l'entrée correspondante à cette station
		bdd_suivi.push({
			id: id_station,
			nom: nom_station,
			subscribers: [{id: id_user,
							end: moment().add(duration, 'm').unix() // Fin dans 30 secondes
						}]
		})

		//console.log("FIN : "+moment().add(30, 's').unix())

		message[0].title = "Ok, je vais surveiller la station "+nom_station;
		message[0].subtitle = "Pendant "+moment.duration(duration, 'minutes').humanize();
		Conv.sendGenericMessage(id_user, message)
		//Conv.sendTextMessage(id_etienne, "ok_added_to_tab")
		return 'ok'
	}
}

function unscubscribe_station(id_user, id_station, nom_station) {
	var bdd_station = bdd_suivi.find(find_station_in_bdd, id_station);

	console.log(bdd_suivi)

	var message = [{"title": "",
		                "buttons": [{
			                "type": "postback",
			                "title": "🔭 Surveiller",
			                "payload": JSON.stringify({
                                          context: 'suivi',
                                          request: 'suivre_station',
                                          id_station: id_station,
				                          nom: nom_station
                                })
			                }]
		                }]

	if(bdd_station !== undefined) { // Si la station y est déjà
		console.log("UNSUBSCRIBE : "+bdd_station.subscribers.find(find_user_in_station, id_user))

		if(bdd_station.subscribers.find(find_user_in_station, id_user) !== undefined) { // Si on est inscrit

			// On l'enlève
			bdd_suivi[bdd_suivi.indexOf(bdd_station)].subscribers.splice(bdd_station.subscribers.indexOf(bdd_station.subscribers.find(find_user_in_station, id_user)), 1)

			message[0].title = "Ok, je ne surveille plus la station "+nom_station+" ;)";
			Conv.sendGenericMessage(id_user, message)
			//Conv.sendTextMessage(id_etienne, "unsubscibed")
			return 'ok'
		}
		else {
			message[0].title = "Je ne surveille pas la station "+nom_station+" ;)";
			Conv.sendGenericMessage(id_user, message)
			//Conv.sendTextMessage(id_etienne, "not_subscribing")
			return 'not_subscribing'
		}
	}
	else {
		Conv.sendTextMessage(id_user, "Une erreur s'est produite ... :/")
		return 'station_not_found'
	}
}



function stations_suivies_user (id_user) {
	var stations_suivies_par_user = [];
	var message = []

	console.log("FTC stations suivies")

	// Recherche des stations suivies par l'user
	for(var i = 0 ; i < bdd_suivi.length ; i++) // Pour chaque station suivie
	{
		console.log("...")

		// On cherche si notre user la suit
		for(var j = 0 ; j < bdd_suivi[i].subscribers.length ; j++) // Pour chaque user suivant cette station
		{
			console.log("---")

			if(bdd_suivi[i].subscribers[j].id == id_user) // Si l'user est un des subscribers à la station
			{
				console.log(bdd_suivi[i].id+" suivie")
				stations_suivies_par_user.push({id: bdd_suivi[i].id, nom: bdd_suivi[i].nom}) // On ajoute cette staion aux stations suivies par l'user

				var infos_station = Velov.findStation(bdd_suivi[i].id); // Recherche des infos de la station en question

				var url_img = "https://maps.googleapis.com/maps/api/staticmap?maptype=roadmap&size=573x300"+
            			"&markers=color:red%7Clabel:V%7C"+infos_station.latitude+","+infos_station.longitude+
            			"&key="+Conf_ville.googleAPIS_client;

          		var item_url = "http://maps.google.com/?q="+infos_station.latitude+","+infos_station.longitude;

				message.push({"title": bdd_suivi[i].nom,
						"image_url": url_img,
                        "item_url": item_url,
						"subtitle": "🚲 "+ infos_station.free_bikes + " "+Conf_ville.nom_velo+ "\n" + 
									"🏁 " + infos_station.empty_slots + " places"+ "\n" +
									'Fin ' + moment().to(moment.unix(bdd_suivi[i].subscribers[j].end)),
		                "buttons": [{
			                "type": "postback",
			                "title": "🔕 Ne plus surveiller",
			                "payload": JSON.stringify({
			                            context: 'suivi',
			                            request: 'unsubscribe_station',
			                            id_station: bdd_suivi[i].id,
			                            nom: bdd_suivi[i].nom
			                    }) 
			                }]
		                })
				break;
			}
		}
	}

	if(stations_suivies_par_user.length != 0)
	{
		Conv.sendTextMessage(id_user, "Voici les stations surveillées")
		Conv.sendGenericMessage(id_user, message)
	}
	else { // Aucune station de suivie
		Conv.sendTextMessage(id_user, "Tu ne surveille aucune station !")
	}
}


function quick_reply_suivre_station (sender, id_station, nom_station) {
  Conv.sendQuickReplies(sender, "Pendant combien de temps dois-je surveiller la station "+nom_station+" ?", [{
                                        "content_type":"text",
                                        "title": "15 min",
                                        "payload": JSON.stringify({
                                                    request: 'suivre',
                                                    id_station: id_station,
                                                    nom_station: nom_station,
                                                    duration: 15
                                                    })
                                    },
                                    {
                                        "content_type":"text",
                                        "title": "30 min",
                                        "payload": JSON.stringify({
                                                    request: 'suivre',
                                                    id_station: id_station,
                                                    nom_station: nom_station,
                                                    duration: 30
                                                    })
                                    },{
                                        "content_type":"text",
                                        "title": "1 heure",
                                        "payload": JSON.stringify({
                                                    request: 'suivre',
                                                    id_station: id_station,
                                                    nom_station: nom_station,
                                                    duration: 60
                                                    })
                                    }])
}




module.exports = {
	suivre_station: suivre_station,
	unscubscribe_station: unscubscribe_station,
	stations_suivies_user: stations_suivies_user,
	quick_reply_suivre_station: quick_reply_suivre_station,
	station_est_surveillee: station_est_surveillee
}