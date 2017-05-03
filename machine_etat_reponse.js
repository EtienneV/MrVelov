'use strict'

const Users = require('./users')
const Conv = require('./conversation')
const Utils = require('./utils')
const Conf_ville = require('./config_ville')

// Si un user n'est pas dans le tableau, il est à l'état initial
var tab_etats = [];


// initial, position_attente_objet (E3), objet_attente_position (E2)
function etat(sender) {

	for(var i = 0 ; i < tab_etats.length ; i++)
	{
		if(tab_etats[i].id_user == sender) {
			return tab_etats[i]
		}
	}

	// Si il n'est pas dans le tableau, son état est initial
	return {id_user: sender,
			etat: "initial", 
			info: {}}
}

function set_etat(sender, etat, info) {
	for(var i = 0 ; i < tab_etats.length ; i++)
	{
		if(tab_etats[i].id_user == sender) { // Si on le trouve
			if(etat != 'initial'){
				tab_etats[i].etat = etat;
				tab_etats[i].info = info;
				return 'ok'
			}
			else { // Si on veut mettre l'état initial, on le supprime du tableau
				tab_etats.splice(i, 1) 
			return 'ok'
			}
		}
	}

	console.log('l user n avait pas d etat')

	// pas trouvé, donc initial
	// Si on ne l'a pas trouvé, on l'ajoute à condition que ce ne soit pas l'état initial
	if(etat != 'initial'){
		console.log('on ajoute un nouvel user à la lable d etat')
		tab_etats.push({
			id_user: sender,
			etat: etat,
			info: info
		})
		return 'ok'
	}
	else { // Si on passe d'initial à initial
		return 'ok'
	}
}

function envoi_position_adresse (sender, gps, tab_stations) {
	var etat_sender = etat(sender)

	if((etat_sender.etat == "initial") || (etat_sender.etat == "position_attente_objet"))
	{
		//console.log("e0 e3 -> e3")
		if(tab_stations) { // Si on a déjà la liste des stations proches 
			position_GPS_E0(sender, gps, tab_stations)
		}
		else position_GPS_E0(sender, gps)

		set_etat(sender, 'position_attente_objet', gps) //E3, stockage du GPS
	}
	else if(etat_sender.etat == "objet_attente_position") // Etat E2 : en attente de la position, connait objet
	{
		//console.log("e2 -> e0")
		// On envoie R3
		place_velo_adresse(sender, gps, etat_sender.info)
		set_etat(sender, 'initial')
	}
}


function envoi_place_velo (sender, objet) {
	var etat_sender = etat(sender)

	if((etat_sender.etat == "initial") || (etat_sender.etat == "objet_attente_position"))
	{
		//console.log("e0 e3 -> e2")
		demande_de_position(sender, objet) // on demande la position

		set_etat(sender, 'objet_attente_position', objet) //E2, stockage de l'objet de la recherche
	}
	else if(etat_sender.etat == "position_attente_objet") // Etat E3 : en attente de l'objet, on connait la position'
	{
		//console.log("e3 -> e0")
		// On envoie R3
		place_velo_adresse(sender, etat_sender.info, objet)
		set_etat(sender, 'initial')
	}
}

//🚲🏁📱🔖📈📊🚩📌📍❤️💛💚💙💜💟❌⭕❓❔⚠🔰❎✅✔☑📣📢🔔🔕❎✅✔☑📣📢🔔🔕


// R1
function bonjour(sender) {
	Users.infos_user(sender).then(function(i_user){
        Conv.demande_localisation(sender, "Bonjour "+i_user.first_name+" ! Partage moi ta position ou envoie moi une adresse, je te trouverai les stations "+Conf_ville.nom_velo+" les plus proches ! :)");
    })
    set_etat(sender, 'initial')
}

function help(sender) {
	Conv.sendTextMessage(sender, "Envoie-moi une adresse ou partage-moi ta position, je trouverai les stations "+Conf_ville.nom_velo+" à proximité\nPour partager ta position GPS avec moi, regarde comment faire ici : http://bit.ly/2dZX7A5").then(function(sender){
		Conv.sendTextMessage(sender, "Demande-moi de surveiller une station et je t'enverrai un message lorsqu'il n'y a plus beaucoup de places ou de "+Conf_ville.nom_velo+" !\nJe peux par exemple t'écrire dès qu'un "+Conf_ville.nom_velo+" arrive à une station vide, ou dès qu'une place se libère ;)").then(function(sender){
			Conv.demande_localisation(sender, 'Je comprends aussi quelques phrases simples, telles que "Combien de places à Charpennes ?"ou bien "' + ""+Conf_ville.nom_velo+" à Part Dieu" + '"')
		})
	})
	
	
}

// R9
function merci(sender) {
	Users.infos_user(sender).then(function(i_user){
        Conv.sendTextMessage(sender, "C'est un plaisir d'être à ton service, "+i_user.first_name+" :)")
    })
    set_etat(sender, 'initial')
}

// R7
function nom_station(sender, result) {
	Conv.cardmessage_tab_stations(sender, result)
	set_etat(sender, 'initial')
}

// R6
function place_velo_station (sender, result, objet) {
	var phrase_objet = ""
	var nombre = 0

	if(objet == "place") {
		phrase_objet = "places disponibles 🏁"
	}
	else if (objet == "velo") {
		phrase_objet = ""+Conf_ville.nom_velo+" 🚲"
	}

	for(var i = 0; i < result.length; i++) {
		if(objet == "place") {
			nombre = result[i].empty_slots
		}
		else if (objet == "velo") {
			nombre = result[i].free_bikes
		}

        Conv.sendTextMessage(sender, 'À la station ' + Utils.miseEnFormeNom(result[i].name) + ", il y a " + nombre + " " + phrase_objet)
    }

    set_etat(sender, 'initial')
}

// R3
function place_velo_adresse(sender, gps, objet) {
	var phrase_objet = ""

	if(objet == "place") {
		phrase_objet = "places"
	}
	else if (objet == "velo") {
		phrase_objet = Conf_ville.nom_velo
	}

	Conv.sendTextMessage(sender, 'Voici les '+phrase_objet+' les plus proches')

	Conv.cardmessage_stations_proches(sender, gps, objet, 5)

	set_etat(sender, 'initial')
}

// R4 + R5
function position_GPS_E0(sender, gps, tab_stations) {
	Conv.sendTextMessage(sender, 'Voici les stations les plus proches')

	if(tab_stations) // Si on a déjà la liste des stations proches 
	{
		Conv.cardmessage_tab_stations(sender, tab_stations).then(function (res) {
            Conv.sendBoutons_velov_place(sender, gps)
        })
	}
	else { // Si on a juste les coordonnées GPS
		console.log('E0 ELSE')
		Conv.cardmessage_stations_proches(sender, gps, 'station', 5).then(function (res) {
            Conv.sendBoutons_velov_place(sender, gps)
        })
	}
}

function demande_de_position(sender, objet) {
	var phrase_objet = ""

	if(objet == "place") {
		phrase_objet = "places"
	}
	else if (objet == "velo") {
		phrase_objet = Conf_ville.nom_velo
	}

	Conv.demande_localisation(sender, "D'accord !\nEnvoie-moi une adresse ou ta position, je trouverai les "+phrase_objet+" les plus proches")
}

module.exports = {
	bonjour: bonjour, 
	merci: merci,
	nom_station: nom_station, 
	place_velo_station: place_velo_station,
	place_velo_adresse: place_velo_adresse,
	envoi_position_adresse: envoi_position_adresse,
	envoi_place_velo: envoi_place_velo,
	help: help
};