const request = require('request')
const crontab = require('node-crontab');
const turf = require('turf')
const Conf_ville = require('./config_ville')

const apiKey = Conf_ville.api_decaux;
const contract_decaux = Conf_ville.contract_decaux;

var stations; // Contient les infos de toutes les stations, mis à jour toutes les minutes

var get_stations = function () {
  return stations
}

// On met à jour "manuellement la première fois"
request('https://api.jcdecaux.com/vls/v1/stations?contract='+contract_decaux+'&apiKey='+apiKey, function (error, response, body) { // On récupère les infos vélov
      if (!error && response.statusCode == 200) {
        var data_decaux = JSON.parse(body);

        var s = [];

        for(var i = 0 ; i < data_decaux.length ; i++) {
          s.push({
            "empty_slots": data_decaux[i].available_bike_stands,
            "extra": {
              "address": data_decaux[i].address,
              "banking": data_decaux[i].banking,
              "bonus": data_decaux[i].bonus,
              "last_update": data_decaux[i].last_update,
              "slots": data_decaux[i].bike_stands,
              "status": data_decaux[i].status,
              "uid": data_decaux[i].number
            },
            "free_bikes": data_decaux[i].available_bikes,
            "latitude": data_decaux[i].position.lat,
            "longitude": data_decaux[i].position.lng,
            "name": data_decaux[i].name
          })
        }

        stations = s;
      }
    })

crontab.scheduleJob("*/1 * * * *", function(){ //This will call this function every 1 minutes 

    request('https://api.jcdecaux.com/vls/v1/stations?contract='+contract_decaux+'&apiKey='+apiKey, function (error, response, body) { // On récupère les infos vélov
      if (!error && response.statusCode == 200) {
        var data_decaux = JSON.parse(body);

        var s = [];

        for(var i = 0 ; i < data_decaux.length ; i++) {
          s.push({
            "empty_slots": data_decaux[i].available_bike_stands,
            "extra": {
              "address": data_decaux[i].address,
              "banking": data_decaux[i].banking,
              "bonus": data_decaux[i].bonus,
              "last_update": data_decaux[i].last_update,
              "slots": data_decaux[i].bike_stands,
              "status": data_decaux[i].status,
              "uid": data_decaux[i].number
            },
            "free_bikes": data_decaux[i].available_bikes,
            "latitude": data_decaux[i].position.lat,
            "longitude": data_decaux[i].position.lng,
            "name": data_decaux[i].name
          })
        }

        stations = s;
      }
    })

});



// Obtenir les infos d'une station en fournissant son uid
function findStation (id_station) {
  var find_station_fct = function (station) {
    return station.extra.uid == this;
  };

  return stations.find(find_station_fct, id_station)
}

var getGeojsonAll = function () {
    var geoJson = {
      type: "FeatureCollection",
      features: []
    };

    var s = stations;
    var i;

    for (i = 0 ; i < s.length ; i++)
    {
      geoJson.features.push({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [s[i].longitude, s[i].latitude] // lon / lat
        },
        properties: {
          uid: s[i].extra.uid,
          name: s[i].name,
          bike: s[i].free_bikes,
          slots: s[i].empty_slots
        }
      });
    }

    return geoJson;
};

var supprStationGeojson = function (geojson, uid) {
  var i;
  for (i = 0 ; i < geojson.features.length ; i++)
  {
    if(geojson.features[i].properties.uid == uid)
    {
      geojson.features.splice(i, 1);
    }
  }
  return geojson;
};


var nearest_station = function (coord, nb) {
  var geovelov = getGeojsonAll();

    var result = [];

    var nearest;

    var point = {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: coord
      }
    };

    var i;
    for (i = 0 ; i < nb ; i++)
    {
      nearest = turf.nearest(point, geovelov); // On trouve le plus proche
      result.push(nearest.properties.name); // On l'ajoute
      geovelov = supprStationGeojson(geovelov, nearest.properties.uid); // On le supprime de la collection
    }

    return result;
}

var nearest_velov = function (coord, nb) {
    var geovelov = getGeojsonAll();

    var result = [];

    var nearest;

    var point = {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: coord
      }
    };

    var i = 0;
    while (i < nb)
    {
      nearest = turf.nearest(point, geovelov); // On trouve le plus proche

      if(nearest.properties.bike != 0) 
      {
        result.push(nearest.properties.name); // On l'ajoute
        i++;
      }

      geovelov = supprStationGeojson(geovelov, nearest.properties.uid); // On le supprime de la collection
    }

    return result;
}

var nearest_place = function (coord, nb) {
    var geovelov = getGeojsonAll();

    var result = [];

    var nearest;

    var point = {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: coord
      }
    };

    var i = 0;
    while (i < nb)
    {
      nearest = turf.nearest(point, geovelov); // On trouve le plus proche

      if(nearest.properties.slots != 0) {
        result.push(nearest.properties.name); // On l'ajoute
        i++;
      }

      geovelov = supprStationGeojson(geovelov, nearest.properties.uid); // On le supprime de la collection
    }

    return result;
}


module.exports = {

  test: function (coord) {
    console.log('Debut du test')

    console.log(JSON.stringify(nearest_station(coord, 3)))

    crontab.scheduleJob("*/1 * * * *", function(){
      console.log(stations[263].name + ' : ' + stations[263].free_bikes)
    })
  }, 

  get_stations: get_stations,
  nearest_station: nearest_station,
  nearest_velov: nearest_velov,
  nearest_place: nearest_place,
  findStation: findStation
};