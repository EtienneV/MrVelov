const Conf_ville = require('./config_ville')
const Velov = require('./velov')
const MapboxClient = require('mapbox');
var client = new MapboxClient(Conf_ville.mapbox_client);
var googleMapsClient = require('@google/maps').createClient({
  key: config_ville.googleMaps_client
});

//var str_recherche = "hotel de ville";

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

function geocoding_mapbox (recherche) {
	return new Promise(function(resolve, reject) {
	  client.geocodeForward(recherche, {
			  //country: 'fr',
			  bbox: Conf_ville.bbox // Zone où il y a des vélov

			}, function(err, res) {

			if(res.features < 1) reject("rien_trouve")

		  	resolve(res.features[0].center);
		});
	});
}

function geocoding_googleMaps (recherche) {
	return new Promise(function(resolve, reject) {
		// Geocode an address.
		googleMapsClient.geocode({
		  address: recherche ,//+ ', Rhône',
		  bounds: Conf_ville.bbox_maps
		}, function(err, response) {
		  if (!err) {
		    //console.log(response.json.results);
		    //console.log(response.json.results[0].geometry.location);
		    if(response.json.results.length != 0) resolve([response.json.results[0].geometry.location.lng, response.json.results[0].geometry.location.lat])
		    else  // Si tableau vide
		    {
		    	// Si echec, on essaie avec mapbox
		    	geocoding_mapbox (recherche).then(function (res) {
		    		resolve(res)
		    	}, function (res) {
		    		reject(res)
		    	})
		    }
		  }
		  else {
		  	// Si echec, on essaie avec mapbox
		    geocoding_mapbox (recherche).then(function (res) {
		    	resolve(res)
		    }, function (res) {
		    	reject(res)
		    })
		  }
		});
	});

}

// Choix du fournisseur de géocodage
var geocoding = function (recherche) {
	//return geocoding_mapbox(recherche);
	return geocoding_googleMaps(recherche);
}

var liste_lieux = [
	{
		mot: "grange blanche",
		gps: [4.878854, 45.742951]
	},
	{
		mot: "grange-blanche",
		gps: [4.878854, 45.742951]
	},
	{
		mot: "dauphine lacassagne",
		gps: [4.869277, 45.752859]
	},
	{
		mot: "reconnaissance balzac",
		gps: [4.885297, 45.754413]
	},
	{
		mot: "sucre",
		gps: [4.814961, 45.736731]
	},
	{
		mot: "cpe",
		gps: [4.868795, 45.783836]
	},
	{
		mot: "hotel de ville",
		gps: [4.835048, 45.767630]
	},
	{
		mot: "meyzieu",
		gps: [5.004145, 45.766833]
	},
	{
		mot: "part dieu",
		gps: [4.858896, 45.761276]
	},
	{
		mot: "part-dieu",
		gps: [4.858896, 45.761276]
	},
	{
		mot: "emile zola",
		gps: [4.884213, 45.768620]
	},
	{
		mot: "zola",
		gps: [4.884213, 45.768620]
	},
	{
		mot: "georges pompidou",
		gps: [4.865497, 45.759267]
	},
	{
		mot: "george pompidou",
		gps: [4.865497, 45.759267]
	},
	{
		mot: "pompidou",
		gps: [4.865497, 45.759267]
	},
	{
		mot: "minimes",
		gps: [4.820968, 45.758006]
	},
	{
		mot: "abbe larue",
		gps: [4.819123, 45.756015]
	},
	{
		mot: "stade saez",
		gps: [4.883550, 45.735074]
	}
];


var rechercheStationParNom = function (recherche, tab_stations) {
  var result = [];

  recherche = recherche.toLowerCase().sansAccent().replace(/[\$\^]+/, "a"); // En minuscule et sans accents

  var mots_cherches = recherche.split(" ");

  for(var i = 0; i < tab_stations.length; i++){
    var success = 1;

    for(var j = 0; j < mots_cherches.length; j++){
      if(tab_stations[i].name.toLowerCase().sansAccent().indexOf(mots_cherches[j]) == -1)
      {
        success = 0;
      }
    }

    if(success) 
    {
      result.push(tab_stations[i])
    }
  }

  return result;

}

/*
Recherche dans la liste de stations. Si on trouve, on renvoie les stations les plus proches.
Sinon, on cherche si les mots sont contenus dans des noms de stations. Si oui, on renvoie ces stations.
Sinon, on cherche si ça correspond à une adresse. Si oui, on renvoie les stations les plus proches.
*/
var find_lieu_station = function (recherche) {
	var recherche_par_nom = []; 

	recherche = recherche.toLowerCase().sansAccent().replace(/[\$\^]+/, "a"); // En minuscule et sans accents

	console.log(recherche)

	return new Promise(function(resolve, reject) {

		// On cherche si c'est dans la liste
		for(var i = 0 ; i < liste_lieux.length ; i++) {

			if(recherche == liste_lieux[i].mot) { // Si le lieu est identifié dans la liste

				var stations_proches = Velov.nearest_station(liste_lieux[i].gps, 5); // On cherhe les noms des x stations à proximité

				console.log(JSON.stringify(stations_proches))

				recherche_par_nom = []; 

				// On ajoute chaque station trouvée
				for(var j = 0; j < stations_proches.length; j++)
				{
					recherche_par_nom.push(rechercheStationParNom(stations_proches[j], Velov.get_stations())[0])
				}
				console.log(JSON.stringify(recherche_par_nom))

				if(recherche_par_nom.length > 0) // Si on a un résultat par cette méthode
				{
					var result = {
						infos : {
							type : "gps",
							gps : liste_lieux[i].gps
						},
						liste : recherche_par_nom
					}

					resolve(result) // On quitte la fonction et on renvoie les stations proches
					return 'ok'
				}
				else reject('lieu_non_trouve');
			}
		}

		console.log(recherche+" pas dans la liste")


		// On cherche si les termes de recherche sont dans un nom de station
		var recherche_par_nom = rechercheStationParNom(recherche, Velov.get_stations());

		if(recherche_par_nom.length > 0) // Si on a un résultat par cette méthode
		{
			var result = {
				infos : {
					type : "stations"
				},
				liste : recherche_par_nom
			}

			resolve(result)
		}
		else
		{
			geocoding(recherche).then(function (res) { // Recherche de l'adresse
				var stations_proches = Velov.nearest_station(res, 5); // On cherhe les noms des x stations à proximité

				var recherche_par_nom = []; 

				for(var i = 0; i < stations_proches.length; i++)
				{
					recherche_par_nom.push(rechercheStationParNom(stations_proches[i], Velov.get_stations())[0])
				}

				if(recherche_par_nom.length > 0) // Si on a un résultat par cette méthode
				{
					var result = {
						infos : {
							type : "gps",
							gps : res
						},
						liste : recherche_par_nom
					}

					resolve(result)
				}
				else reject('lieu_non_trouve');
			}, function (res) {
				reject('lieu_non_trouve');
			})
		}

	})
}


module.exports = {

  	geocoding: geocoding,
  	find_lieu_station: find_lieu_station,
  	rechercheStationParNom: rechercheStationParNom

};