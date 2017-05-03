'use strict'

const request = require('request')
const Velov = require('./velov')
const Lieux = require('./lieux')
const Utils = require('./utils')
const Conf_ville = require('./config_ville')

const token_messenger = Conf_ville.token_messenger;

function sendTextMessage(sender, text) {
    let messageData = { text:text }

    return new Promise(function(resolve, reject) {

      request({
          url: 'https://graph.facebook.com/v2.6/me/messages',
          qs: {access_token:token_messenger},
          method: 'POST',
          json: {
              recipient: {id:sender},
              message: messageData,
          }
      }, function(error, response, body) {
          if (error) {
              console.log('Error sending messages: ', error)
              reject('ko')
          } else if (response.body.error) {
              console.log('Error sendTextMessage : ', response.body.error)
              reject('ko')
          }
          else {
              resolve(sender)
          }
      })

    })
}

function sendImageMessage(sender, image) {
    let messageData = { 
      attachment:{
        type:"image",
        payload:{
          url: image
        }
      } 
    }

    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {access_token:token_messenger},
        method: 'POST',
        json: {
            recipient: {id:sender},
            message: messageData,
        }
    }, function(error, response, body) {
        if (error) {
            console.log('Error sending messages: ', error)
        } else if (response.body.error) {
            console.log('Error sendTextMessage : ', response.body.error)
        }
    })
}

function sendGenericMessage(sender, elements) {
    var json_reponse = {
      "attachment":{
        "type":"template",
        "payload":{
          "template_type":"generic",
          "elements":elements
        }
      }
    };

    return new Promise(function(resolve, reject) {

        request({
            url: 'https://graph.facebook.com/v2.6/me/messages',
            qs: {access_token:token_messenger},
            method: 'POST',
            json: {
                recipient: {id:sender},
                message: json_reponse,
            }
        }, function(error, response, body) {
            if (error) {
                console.log('Error sending generic messages: ', error)
                reject('ko')
            } else if (response.body.error) {
                console.log('Error sendGenericMessage : ', response.body.error)
                reject('ko')
            }
            else {
                resolve('ok')
            }
        })
    })
}

function sendQuickReplies(sender, text, quick_replies) {
    var json_reponse = {
        "text":text,
        "quick_replies":quick_replies
    };

    return new Promise(function(resolve, reject) {

        request({
            url: 'https://graph.facebook.com/v2.6/me/messages',
            qs: {access_token:token_messenger},
            method: 'POST',
            json: {
                recipient: {id:sender},
                message: json_reponse,
            }
        }, function(error, response, body) {
            if (error) {
                console.log('Error sending generic messages: ', error)
                reject('ko')
            } else if (response.body.error) {
                console.log('Error sendQuickReplies : ', response.body.error)
                reject('ko')
            }
            else {
                resolve('ok')
            }
        })
    })
}

function cardmessage_stations_proches(sender, coord, requete, nb_reponses) {
    return new Promise(function(resolve, reject) {

        var coord_user = {lat: coord[1], long: coord[0]};

        var stations_proches;
        var result_recherche = []; 
        var url_img = "";
        var item_url = "";
        var elements = [];

        if(requete == 'station')
        {
            stations_proches = Velov.nearest_station(coord, nb_reponses);
        }
        else if((requete == 'velov') || (requete == 'velo'))
        {
            stations_proches = Velov.nearest_velov(coord, nb_reponses);
        }
        else if(requete == 'place')
        {
            stations_proches = Velov.nearest_place(coord, nb_reponses);
        }
        else return 0;
        
        for(var j = 0; j < stations_proches.length; j++)
        {
          result_recherche.push(Lieux.rechercheStationParNom(stations_proches[j], Velov.get_stations())[0]);
        }

        for(var j = 0; j < result_recherche.length; j++) {

          url_img = "https://maps.googleapis.com/maps/api/staticmap?maptype=roadmap&size=573x300"+
            "&markers=size:medium%7Ccolor:green%7C"+coord_user.lat+","+coord_user.long+
            "&markers=color:red%7Clabel:V%7C"+result_recherche[j].latitude+","+result_recherche[j].longitude+
            "&visible="+coord_user.lat+","+coord_user.long+"%7C"+result_recherche[j].latitude+","+result_recherche[j].longitude+
            "&sensor=false"+
            "&key="+Conf_ville.googleAPIS_client;

          item_url = "http://maps.google.com/?q="+result_recherche[j].latitude+","+result_recherche[j].longitude;

          elements.push({"title": Utils.miseEnFormeNom(result_recherche[j].name),
                          "image_url": url_img,
                          "item_url": item_url,
                          "subtitle": "🚲 "+result_recherche[j].free_bikes + " "+Conf_ville.nom_velo+ "\n🏁 " + result_recherche[j].empty_slots + " places"+ "\n" + Utils.convertTimestamp(result_recherche[j].extra.last_update),
                          "buttons": [{
                              "type": "postback",
                              "title": "⭐ Favoris",
                              "payload": JSON.stringify({
                                          context: 'favoris',
                                          request: 'add_favori',
                                          id_station: result_recherche[j].extra.uid
                                }) 
                            },{
                              "type": "postback",
                              "title": "🔭 Surveiller",
                              "payload": /*payload_btn_surveiller(tab_stations[j].extra.uid)*/JSON.stringify({
                                          context: 'suivi',
                                          request: 'suivre_station',
                                          id_station: result_recherche[j].extra.uid,
                                          nom: Utils.miseEnFormeNom(result_recherche[j].name)
                                })
                            }]
                         });
        }

        sendGenericMessage(sender, elements).then(function (res) {
            resolve('ok')
        }, function (err) {
            reject('err')
        })

        if(result_recherche.length < 1) 
        {
            sendTextMessage(sender, "Je n'ai pas trouvé la station :-(")
            reject('no_station')
        }
    })
}

function cardmessage_tab_stations(sender, tab_stations) {
    return new Promise(function(resolve, reject) {

        var url_img = "";
        var item_url = "";
        var elements = [];


        for(var j = 0; (j < tab_stations.length) && (j < 10); j++) {

          url_img = "https://maps.googleapis.com/maps/api/staticmap?maptype=roadmap&size=573x300"+
            "&markers=color:red%7Clabel:V%7C"+tab_stations[j].latitude+","+tab_stations[j].longitude+
            "&key="+Conf_ville.googleAPIS_client;

          item_url = "http://maps.google.com/?q="+tab_stations[j].latitude+","+tab_stations[j].longitude;

          elements.push({"title": Utils.miseEnFormeNom(tab_stations[j].name),
                          "image_url": url_img,
                          "item_url": item_url,
                          "subtitle": "🚲 "+tab_stations[j].free_bikes + " "+Conf_ville.nom_velo+ "\n🏁 " + tab_stations[j].empty_slots + " places"+ "\n" + Utils.convertTimestamp(tab_stations[j].extra.last_update),
                          "buttons": [{
                              "type": "postback",
                              "title": "⭐ Favoris",
                              "payload": JSON.stringify({
                                          context: 'favoris',
                                          request: 'add_favori',
                                          id_station: tab_stations[j].extra.uid
                                }) 
                            },{
                              "type": "postback",
                              "title": "🔭 Surveiller",
                              "payload": /*payload_btn_surveiller(tab_stations[j].extra.uid)*/JSON.stringify({
                                          context: 'suivi',
                                          request: 'suivre_station',
                                          id_station: tab_stations[j].extra.uid,
                                          nom: Utils.miseEnFormeNom(tab_stations[j].name)
                                })
                            }]
                        })
        }
        
        sendGenericMessage(sender, elements).then(function (res) {
            resolve('ok')
        }, function (err) {
            reject('err')
        })

        if(tab_stations.length < 1) 
        {
            sendTextMessage(sender, "Je n'ai pas trouvé la station :-(")
              console.log("pas trouve station _ cardmessage")
            reject('no_station')
        }
    })
}

function payload_btn_surveiller (id_station) {
  var is_watched = Suivi.station_est_surveillee(id_station, id_user); // la station est-elle surveillée ?
  var infos_station = Velov.findStation(id_station); // Recherche des infos de la station en question

  var request = '';

  // Si elle est surveillée
  if(is_watched) {
    request = 'unsubscribe_station';
  }
  else {
    request = 'suivre_station';
  }

  return JSON.stringify({
            context: 'suivi',
            request: request,
            id_station: id_station,
            nom: Utils.miseEnFormeNom(infos_station.name)
        });
}

function sendBoutons_velov_place(sender, coord) {
    sendQuickReplies(sender, "Que cherches-tu ?", [{
                                        "content_type":"text",
                                        "title": "🚲 Un "+Conf_ville.nom_velo,
                                        "payload": JSON.stringify({
                                                    context: 'location',
                                                    request: 'velov',
                                                    coord: coord
                                                    }) // context + velov + coord
                                    },
                                    {
                                        "content_type":"text",
                                        "title": "🏁 Une place",
                                        "payload": JSON.stringify({
                                                    context: 'location',
                                                    request: 'place',
                                                    coord: coord
                                                    })
                                    }])
}

function callButton(sender, phone, text, text_button) {

  var json_reponse = {
      "attachment":{
      "type":"template",
         "payload":{
            "template_type":"button",
            "text":text,
            "buttons":[
               {
                  "type":"phone_number",
                  "title":text_button,
                  "payload":phone
               }
            ]
         }
       }
    };

    return new Promise(function(resolve, reject) {

        request({
            url: 'https://graph.facebook.com/v2.6/me/messages',
            qs: {access_token:token_messenger},
            method: 'POST',
            json: {
                recipient: {id:sender},
                message: json_reponse,
            }
        }, function(error, response, body) {
            if (error) {
                console.log('Error sending generic messages: ', error)
                reject('ko')
            } else if (response.body.error) {
                console.log('Error sendGenericMessage : ', response.body.error)
                reject('ko')
            }
            else {
                resolve('ok')
            }
        })
    })
}


function shareButton(sender, title, subtitle, image_url, item_url) {

  var json_reponse = {
      "attachment":{
        "type":"template",
        "payload":{
          "template_type":"generic",
          "elements":[
            {
              "title":title,
              "subtitle":subtitle,
              "image_url":image_url,
              "item_url": item_url,
              "buttons":[
                {
                  "type":"element_share"
                }              
              ]
            }
          ]
        }
      }
    };

    return new Promise(function(resolve, reject) {

        request({
            url: 'https://graph.facebook.com/v2.6/me/messages',
            qs: {access_token:token_messenger},
            method: 'POST',
            json: {
                recipient: {id:sender},
                message: json_reponse,
            }
        }, function(error, response, body) {
            if (error) {
                console.log('Error sending generic messages: ', error)
                reject('ko')
            } else if (response.body.error) {
                console.log('Error sendGenericMessage : ', response.body.error)
                reject('ko')
            }
            else {
                resolve('ok')
            }
        })
    })
}


function demande_localisation(sender, text) {
  sendQuickReplies(sender, text, [{"content_type":"location"}])
}


module.exports = {
    sendTextMessage: sendTextMessage,
    sendImageMessage: sendImageMessage,
    sendGenericMessage: sendGenericMessage,
    cardmessage_stations_proches: cardmessage_stations_proches,
    sendBoutons_velov_place: sendBoutons_velov_place,
    cardmessage_tab_stations: cardmessage_tab_stations,
    callButton: callButton,
    shareButton: shareButton,
    sendQuickReplies: sendQuickReplies,
    payload_btn_surveiller: payload_btn_surveiller,
    demande_localisation: demande_localisation
};