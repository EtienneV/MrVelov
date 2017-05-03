'use strict'

var miseEnFormeNom = function (nom) {
	// On retire le numéro de la station
	var sans_numero = nom.substring(nom.search("-")+2, nom.length)

	// On retire le (FAR)
	if(sans_numero.search("(FAR)") != -1) {
		var sans_far = sans_numero.substring(0, sans_numero.search("(FAR)")-2)
	}
	else sans_far = sans_numero

  return sans_far
}

function convertTimestamp(timestamp) {
  var d = new Date(timestamp + 2*60*60*1000),	// Convert the passed timestamp to milliseconds
		yyyy = d.getFullYear(),
		mm = ('0' + (d.getMonth() + 1)).slice(-2),	// Months are zero based. Add leading 0.
		dd = ('0' + d.getDate()).slice(-2),			// Add leading 0.
		hh = d.getHours(),
		h = hh,
		min = ('0' + d.getMinutes()).slice(-2),		// Add leading 0.
		ampm = 'AM',
		time;
	
	
	// ie: 2013-02-18, 8:35 AM	
	//time = yyyy + '-' + mm + '-' + dd + ', ' + h + ':' + min;
	time = h + ':' + min + ' - ' + dd + '/' + mm;
		
	return time;
}

module.exports = {
	miseEnFormeNom: miseEnFormeNom,
	convertTimestamp: convertTimestamp
};