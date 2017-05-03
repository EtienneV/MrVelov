'use strict'

const Wit = require('./wit/wit').Wit;
const Lieux = require('./lieux')
const Machine_etat = require('./machine_etat_reponse')
const Conv = require('./conversation')
const Suivi = require('./suivi')
const Conf_ville = require('./config_ville')

// Config de WIT
const token_wit = Conf_ville.token_wit;

const actions = {
  say(sessionId, context, message, cb) {
    console.log(message);
    cb();
  },
  merge(sessionId, context, entities, message, cb) {
    cb(context);
  },
  error(sessionId, context, error) {
    console.log(error.message);
  },
};
const clientWit = new Wit(token_wit, actions);


function gps_ou_station(sender, lieu, objet) { // Si on déclare test = true, on n'envoie pas de message avec cette fonction
  return new Promise(function(resolve, reject) {
		Lieux.find_lieu_station(lieu).then(function(lieu_station) {
            if(lieu_station.infos.type == "gps") {
            	if((objet == "velo") || (objet == "place")) {
                	Machine_etat.place_velo_adresse (sender, lieu_station.infos.gps, objet)
                }
                else 
                {
                	Machine_etat.envoi_position_adresse(sender, lieu_station.infos.gps, lieu_station.liste)
                }
                resolve('ok')
            }
            else if(lieu_station.infos.type == "stations") {
                if((objet == "velo") || (objet == "place")) {
                	Machine_etat.place_velo_station (sender, lieu_station.liste, objet)
                }
                else 
                {
                	Machine_etat.nom_station(sender, lieu_station.liste)
                }
                resolve('ok')
            }
            else {
                // RIEN : recherche d'un lieu sur tout le texte du message
                Conv.demande_localisation(sender, "Je n'ai pas compris :/\nEnvoie moi ta position ou une adresse, je trouverai les stations "+Conf_ville.nom_velo+" les plus proches ! :)")

                reject('ko')
            }
        }, function(err) {
        	//console.log("GPS OU STATION ERREUR : "+err)
        	Conv.demande_localisation(sender, "Je n'ai pas trouvé cet endroit :/\nEssaie avec une autre adresse, ou envoie moi ta position GPS ! :)")

          reject('ko')
        }) 
  })   
}

function comprehension (sender, text) {

	clientWit.message(text, (error, data) => { // Interprétation de la question
              if (error) {
                console.log('Oops! Got an error: ' + error);
                Conv.sendTextMessage(sender, "Aïe, il semblerait que j'aie un petit problème ... :/")

                 //RIEN : recherche d'un lieu sur tout le texte du message
              } else { // Si on a compris la question

                if(data.entities.interaction) // Si on a une "interaction"
                {
                  if(data.entities.interaction[0].value == 'hello') // Si on a reçu un bonjour
                  {
                    // BONJOUR
                    Machine_etat.bonjour(sender)
                  }
                  else if(data.entities.interaction[0].value == 'merci') // Si on a reçu un merci
                  {
                    // MERCI
                    Machine_etat.merci(sender)
                  }
                  else if(data.entities.interaction[0].value == 'help') // Si on a une demande d'aide
                  {
                    // AIDE
                    Machine_etat.help(sender)
                  }
                  else if(data.entities.interaction[0].value == 'stations_suivies') // Si on demande les stations suivies
                  {
                    // STATIONS SUIVIES
                    Suivi.stations_suivies_user(sender)
                  }
                  else {
                    // RIEN : recherche d'un lieu sur tout le texte du message
                    gps_ou_station(sender, text, 'none')  
                  }
                }
                else if(data.entities.location) // Si un lieu est précisé
                {
                  var lieu = data.entities.location[0].value; // le lieu repéré

                    if(data.entities.recherche) // Si on sait ce que l'utilisateur cherche (vélo ou place)
                    {
                      if(data.entities.recherche[0].value == 'place') // Si on cherche une place
                      {
                        // LIEU + PLACE  
                        console.log("PLACES + LIEU")      
                        gps_ou_station(sender, lieu, 'place')
                      }
                      else if(data.entities.recherche[0].value == 'velo') // Si on cherche une velo
                      {
                        // LIEU + VELO
                        gps_ou_station(sender, lieu, 'velo')    
                      }
                      else {
                        // LIEU
                        gps_ou_station(sender, lieu, 'none')
                      }
                    }
                    else {    
                      // LIEU
                      gps_ou_station(sender, lieu, 'none')  
                    }
                }
                else if(data.entities.recherche) // Si on sait ce que l'utilisateur cherche (vélo ou place)
                {
                  if(data.entities.recherche[0].value == 'place') // Si on cherche une place
                  {
                    // PLACE   

                    // On vérifie si "place" ne correspond pas en fait à un lieu
                    /*gps_ou_station(sender, text, 'none', true).then(function (res) {
                      // C'est en fait un lieu
                      // gps_ou_station a fait le nécessaire
                    }, function (err) {
                      // Ca n'est pas un lieu, on cherche bien une place
                      Machine_etat.envoi_place_velo (sender, 'place')  
                    })*/

                     Machine_etat.envoi_place_velo (sender, 'place')                    
                  }
                  else if(data.entities.recherche[0].value == 'velo') // Si on cherche une velo
                  {
                    // VELO
                    Machine_etat.envoi_place_velo (sender, 'velo')                     
                  }
                  else {
                    // RIEN : recherche d'un lieu sur tout le texte du message
                    gps_ou_station(sender, text, 'none')  
                  }
                }
                else {
                  // RIEN : recherche d'un lieu sur tout le texte du message
                  gps_ou_station(sender, text, 'none')  
                }
              }
            });
}




module.exports = {
	comprehension: comprehension
};