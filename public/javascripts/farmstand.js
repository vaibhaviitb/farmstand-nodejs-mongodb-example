// GLOBALS
var MAP;             // The Google Map object
var GEO;             // The Google Geocoder object
var CURR_STATE;      // The currently selected state
var STATES     = []; // All state names
var STATE_GEOS = {}; // Known State Geo-Info
var LOCS       = []; // Current locations of interest
var MAP_LOCS   = []; // Map markers for the locations

// stateGeoObj
function stateGeoObj(stateName, locationLat, locationLon, zoomLevel) {
    this.LocAddState = stateName;
    this.LocLat      = locationLat;
    this.LocLon      = locationLon;
    this.ZoomLevel   = zoomLevel;
}

// STATE-LEVEL AJAX CALLS
function getStates() {
    $.ajax({
        type:     'GET',
        url:      'states.json',
        dataType: 'json',
        timeout:  5000,
        data:     {},
        success: function(data){
            STATES = data;
	    popList($('#state'),       STATES, "Choose a state...");
	    popList($('#LocAddState'), STATES);
        },
        error: function(){
            alert("Could not get data from the server.");
        },
        complete: function() {
        }
    });
}

function getStateGeos() {
    $.ajax({
        type:     'GET',
        url:      'stategeo.json',
        dataType: 'json',
        timeout:  5000,
        data:     {},
        success: function(data){
	    if (data.length > 0) {
		for (var i = 0; i < data.length; i++) {
		    STATE_GEOS[data[i].LocAddState] = new stateGeoObj(data[i].LocAddState, data[i].LocLat, data[i].LocLon, data[i].ZoomLevel);
		}
            }
        },
        error: function(){
            console.log("Could not save state geo-info for " + state);
        },
        complete: function() {
        }
    });
}

function setStateGeo(stateName) {
    $.ajax({
        type:     'POST',
        url:      'stategeo.json',
        dataType: 'json',
        timeout:  5000,
        data:     STATE_GEOS[stateName],
        success: function(){
        },
        error: function(){
            console.log("Could not save state geo-info for " + state);
        },
        complete: function() {
        }
    });
}

function getGeo() {
    if (STATE_GEOS[CURR_STATE] != null) {
	setMapView();
	return;
    }

    // Try to get it from Google
    GEO.geocode( { 'address': CURR_STATE + ", USA" }, function(results, status) {
	if (status == google.maps.GeocoderStatus.OK && results.length > 0) {
	    STATE_GEOS[CURR_STATE] = new stateGeoObj(CURR_STATE, results[0].geometry.location.Xa, results[0].geometry.location.Ya, 7);
	    setStateGeo(CURR_STATE); /* Call this async */
	    setMapView();
	} else {
	    console.log("Geocode was not successful for the following reason: " + status);
	}
    });
}

// LOCATION-LEVEL AJAX CALLS
function getLocs(sType, qVal) {
    LOCS     = [];
    for (var idx = 0; idx < MAP_LOCS.length; idx++) {
	MAP_LOCS[idx].setMap(null);
    }
    MAP_LOCS = [];

    if (!qVal || qVal == '_null') {
        $('#viewtbl').attr('disabled', 'disabled');
        return;
    }

    $('#viewtbl').removeAttr('disabled');

    $.ajax({
        type:     'GET',
        url:      'locations.json',
        dataType: 'json',
        timeout:  5000,
        data:     { t: sType, q: qVal },
        success: function(data){
	    LOCS = data;
	    setLocView();
        },
        error: function(){
            alert("Could not get data from the server.");
        },
        complete: function() {
	}
    });    
}

function locsByState() {
    CURR_STATE = $('#state').val();
    getGeo(CURR_STATE);
    getLocs('state', CURR_STATE);
}

function addLoc() {
    var newLoc = { MktName:       $('#MktName').val(),
                   LocAddSt:      $('#LocAddSt').val(),
                   LocAddCity:    $('#LocAddCity').val(),
                   LocAddState:   $('#LocAddState').val(),
                   LocAddZip:     $('#LocAddZip').val(),
		   LocAddCountry: $('#LocAddCountry').val(),
                 };

    var missing_fields = true;
    if (newLoc.MktName && newLoc.LocAddSt && newLoc.LocAddCity && newLoc.LocAddZip) {
        missing_fields = false;
    }

    if (missing_fields) {
        alert('All fields are required to add a new farm stand.');
        return;
    }

    $.ajax({
        type:     'POST',
        url:      'locations.json',
        dataType: 'json',
        timeout:  5000,
        data:     newLoc,
        success: function(data){
	    $('#MktName').val('');
	    $('#LocAddSt').val('');
	    $('#LocAddCity').val('');
	    $('#LocAddZip').val('');
	    $('#state').val($('#LocAddState').val());
            locsByState();
	    alert(newLoc.MktName + ' added successfully.');
        },
        error: function(){
            alert("Could not save the new farm stand.");
        },
        complete: function() {
        }
    });    
}

function setLocGeo(locID, locationGeo) {
    $.ajax({
        type:     'POST',
        url:      'locgeo.json',
        dataType: 'json',
        timeout:  5000,
        data:     { id: locID, lat: locationGeo.Xa, lon: locationGeo.Ya },
        success: function(){
        },
        error: function(){
            console.log("Could not save location geo-info for " + locID);
        },
        complete: function() {
        }
    });
}

// UI FORM FUNCTIONS
function popList (jQEl, newOpts, firstOpt) {
    // Clear out the old select options.
    jQEl.html("");

    // Add on the first option.
    if (firstOpt) {
        jQEl.append('<option value="_null">' + firstOpt + '</option>');
    }

    for (var i = 0; i < newOpts.length; i++) {
        jQEl.append('<option value="' + newOpts[i] + '">' + newOpts[i] + '</option>');
    }
}

function showTable() {
    var tblHTML = '<table id="locations" class="tablesorter"><thead><tr><th>Market</th><th>Address</th><th>City</th><th>State</th></tr></thead><tbody>';
    for (idx in LOCS) {
        var loc = LOCS[idx];
        tblHTML = tblHTML + '<tr><td>' + loc.MktName + '</td><td>' + loc.LocAddSt + '</td><td>' + loc.LocAddCity + '</td><td>' + loc.LocAddState + '</tr></tr>';
    }
    tblHTML = tblHTML + '</tbody></table>';
    $('#modaltable').html(tblHTML);
    $('#locations').tablesorter();
    $('#modaltable').dialog({ height: 600, width: 600, modal: true, title: $('#state').val() + ' Farm Stands' });
}

// GOOGLE MAPS API FUNCTIONS
function gmInitialize() {
    $('#contents').html('<div id="map"></div>');
    var myLatLng = new google.maps.LatLng(29.516596899999996, -95.71289100000001);
    GEO = new google.maps.Geocoder();
    MAP = new google.maps.Map(document.getElementById('contents'), {
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        center: myLatLng,
        zoom: 4
    });
}

function gmAddrLookup(address, name, loc_id) {
    GEO.geocode( { 'address': address }, function(results, status) {
	if (status == google.maps.GeocoderStatus.OK) {
	    gmLocMarker(name + ': ' + address, results[0].geometry.location.Xa, results[0].geometry.location.Ya);
	    setLocGeo(loc_id, results[0].geometry.location);
	} else {
            console.log("Geocode was not successful for the following reason: " + status);
	}
    });
}

function gmLocMarker(locTitle, locLat, locLon) {
    var gmMarkerPos = new google.maps.LatLng(locLat, locLon);
    var newMark     = new google.maps.Marker({
	map:      MAP,
        title:    locTitle,
	position: gmMarkerPos,
    });
    MAP_LOCS.push(newMark);
}

// MAP VIEW AND MARKERS
function setMapView() {
    var gmCenter = new google.maps.LatLng(STATE_GEOS[CURR_STATE].LocLat, STATE_GEOS[CURR_STATE].LocLon);
    MAP.setCenter(gmCenter);
    MAP.setZoom(parseInt(STATE_GEOS[CURR_STATE].ZoomLevel));
}

function setLocView() {
    for (var idx = 0; idx < LOCS.length; idx++) {
	var loc  = LOCS[idx];
	var addr = loc.LocAddSt + ', ' + loc.LocAddCity + ', ' + loc.LocAddState + ', ' + loc.LocAddCountry;
	if (!loc.hasOwnProperty('LocLat')) {
	    gmAddrLookup(addr, loc.MktName, loc._id);
	}
	else {
	    gmLocMarker(loc.MktName + ': ' + addr, loc.LocLat, loc.LocLon);
	}
    }
}

/* On startup, grab the states and ZIP codes */
$(document).ready(function(){
    $('#viewtbl').attr('disabled', 'disabled');
    getStates();
    getStateGeos();
    gmInitialize();
});
