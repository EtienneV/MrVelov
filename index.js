'use strict'

const util = require('util');

const express = require('express')
const bodyParser = require('body-parser')
const request = require('request')
const app = express()
const Wit = require('./wit/wit').Wit;
const Lieux = require('./lieux')
const Velov = require('./velov')
const Conv = require('./conversation')
const Utils = require('./utils')
const Suivi = require('./suivi')
const Users = require('./users')
const Annonce = require('./annonce')
const Comprehension = require('./comprehension')
const Machine_etat = require('./machine_etat_reponse')
const Favoris_ctl = require('./favoris_controller')
const Conf_ville = require('./config_ville')

const token_wit = Conf_ville.token_wit;

//
// Config de WIT
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

app.use(express.static(__dirname + '/views'));
app.use('/views/assets/js', express.static(__dirname + '/views/assets/js'));
app.use('/views/dist', express.static(__dirname + '/views/dist'));
app.use('/views/assets/css', express.static(__dirname + '/views/assets/css'));
app.use('/views/assets/fonts', express.static(__dirname + '/views/assets/fonts'));

app.set('port', (process.env.PORT || 5000))

// Process application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({extended: false}))

// Process application/json
app.use(bodyParser.json())

// Index route
app.get('/', function (req, res) {
    res.send('Hello world, I am a chat bot')
})

// for Facebook verification
app.get('/webhook/', function (req, res) {
    if (req.query['hub.verify_token'] === 'xxxxxxxxxxxxxxx') {
        res.send(req.query['hub.challenge'])
    }
    res.send('Error, wrong token')
})

app.get('/xxxxxxxxxxxxxxx', function (req, res) {
    res.send('<h1>Mise à jour des informations utilisateurs dans la base de données</h1>')
    Users.maj_users(res); // Mise à jour du nom, prenom et sexe des nouveaux utilisateurs
})

app.get('/xxxxxxxxxxxxxxx', function (req, res) {
    res.sendFile(__dirname + '/views/test.html')
})

app.get('/xxxxxxxxxxx', function (req, res) {
    res.send('<h1>Envoi du sondage</h1>');
    //Annonce.sondage(Conf_ville.id_etienne);
    Annonce.annonce_allusers();
})

// Spin up the server
app.listen(app.get('port'), function() {
    console.log('running on port', app.get('port'))
})


app.post('/webhook/', function (req, res) {
    let messaging_events = req.body.entry[0].messaging

    for (let i = 0; i < messaging_events.length; i++) {
        let event = req.body.entry[0].messaging[i]
        let sender = event.sender.id

        if(sender != Conf_ville.id_page) // Si ce n'est pas la page qui envoie
        {
          Users.notif_automate(sender)

          // Si c'est un nouvel utilisateur
          Users.new_user(sender).then(function(resu){
            if(resu.result == 'new_user') {
              Users.infos_user(sender).then(function(i_user){
                //console.log(i_user.first_name)
                //Conv.sendTextMessage(resu.id, "Bonjour "+i_user.first_name+" ! Envoie moi ta position ou un nom de station, je t'aiderai à trouver une place ou un Vélo'v !")   
              })
            }
            else
            {
              // Compteur de messages ?
              //Conv.sendTextMessage(resu.id, "Rebonjour !")   
            }
          })

          if (event.message && event.message.text) { // Si le message est du texte

            let text = event.message.text.toLowerCase().sansAccent() // Corps du message

            if(!event.message.quick_reply) // Si ce n'est pas une quick reply
            {
              // Fonction de compréhension du message
              Comprehension.comprehension(sender, text);
            }
            else // Si c'est une quick reply
            {
              var pb = JSON.parse(event.message.quick_reply.payload) // Récupération des données de la postback

              console.log(pb)

              if(pb.request == "velov") // il cherche un velov
              {
                Machine_etat.place_velo_adresse (sender, pb.coord, 'velo')
              }
              else if(pb.request == "place") // il cherche une place
              {
                Machine_etat.place_velo_adresse (sender, pb.coord, 'place')
              }
              else if(pb.request == "suivre") // suivi d'une station
              {
                Suivi.suivre_station(sender, pb.id_station, pb.nom_station, pb.duration)
              }
              else if(pb.request == 'sondage') {
                console.log("SONDAGE");

                if(pb.response == 'tres_utile') {
                  Annonce.sondage_response(sender, pb.response);
                  
                }
                else if(pb.response == 'utilise_pas') {
                  Annonce.sondage_response(sender, pb.response);
                  //Conv.sendTextMessage(sender, "Merci beaucoup pour ce retour ! N'hésite pas à m'écrire un petit commentaire lorsque tu en as envie ! :)");
                }
                else if(pb.response == 'inutile') {
                  Annonce.sondage_response(sender, pb.response);
                  //Conv.sendTextMessage(sender, "Merci beaucoup pour ce retour ! N'hésite pas à m'écrire un petit commentaire lorsque tu en as envie ! :)");
                }
                else if(pb.response == 'marche_pas') {
                  Annonce.sondage_response(sender, pb.response);
                  //Conv.sendTextMessage(sender, "Merci beaucoup pour ce retour ! N'hésite pas à m'écrire un petit commentaire lorsque tu en as envie ! :)");
                }
              }
            }

          }
          // Sinon, si le message est une localisation
          else if(event.message && event.message.attachments[0] && event.message.attachments[0].payload && event.message.attachments[0].payload.coordinates)
          {
            var coord_user = event.message.attachments[0].payload.coordinates;
            var coord = [coord_user.long, coord_user.lat];

            // On envoie cette localisation dans la machine d'état
            Machine_etat.envoi_position_adresse(sender, coord)
          }
          else if (event.postback && event.postback.payload) { // Si l'utilisateur a appuyé sur un bouton

            console.log(event.postback.payload)

            if(event.postback.payload == 'demarrage') { // Si c'est un nouvel user qui a cliqué sur "Démarrer"
              Machine_etat.bonjour(sender)
            }
            else if(event.postback.payload == 'help') { 
              Machine_etat.help(sender)
            }
            else if(event.postback.payload == 'stations_suivies') { 
              Suivi.stations_suivies_user(sender)
            }
            else if(event.postback.payload == 'favoris') { 
              Favoris_ctl.afficher_favoris(sender)
            }
            else
            {
              var pb = JSON.parse(event.postback.payload) // Récupération des données de la postback
              console.log(pb.context)

              if(pb.context == 'location') // CONTEXT : Envoi de la position
              {
                if(pb.request == "velov") // il cherche un velov
                {
                  Machine_etat.place_velo_adresse (sender, pb.coord, 'velo')
                }
                else if(pb.request == "place") // il cherche un velov
                {
                  Machine_etat.place_velo_adresse (sender, pb.coord, 'place')
                }
              }
              else if(pb.context == 'suivi') { // A propos du suivi de stations
                if(pb.request == 'suivre_station') {
                  //Suivi.suivre_station(parseInt(sender), pb.id_station, pb.nom)
                  Suivi.quick_reply_suivre_station(sender, pb.id_station, pb.nom)
                }
                else if(pb.request == 'unsubscribe_station') {
                  Suivi.unscubscribe_station(parseInt(sender), pb.id_station, pb.nom)
                }
                else if(pb.request == 'recherche_place') {
                  Machine_etat.place_velo_adresse (sender, pb.gps, 'place')
                }
                else if(pb.request == 'recherche_velo') {
                  Machine_etat.place_velo_adresse (sender, pb.gps, 'velo')
                }
              }
              else if(pb.context == 'favoris') {
                if(pb.request == 'add_favori') {
                  Favoris_ctl.add_favori(sender, pb.id_station)
                }
                else if(pb.request == 'delete_favori') {
                  Favoris_ctl.delete_favori(sender, pb.id_station)
                }
              }
              
            }

            //Conv.sendTextMessage(sender, pb.request)

            continue
          }
        }
    }
    res.sendStatus(200)
})