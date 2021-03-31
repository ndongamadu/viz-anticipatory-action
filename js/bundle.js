// window.$ = window.jQuery = require('jquery');
function hxlProxyToJSON(input){
    var output = [];
    var keys=[]
    input.forEach(function(e,i){
        if(i==0){
            e.forEach(function(e2,i2){
                var parts = e2.split('+');
                var key = parts[0]
                if(parts.length>1){
                    var atts = parts.splice(1,parts.length);
                    atts.sort();                    
                    atts.forEach(function(att){
                        key +='+'+att
                    });
                }
                keys.push(key);
            });
        } else {
            var row = {};
            e.forEach(function(e2,i2){
                row[keys[i2]] = e2;
            });
            output.push(row);
        }
    });
    return output;
}
var info, 
    legend;

var adm1Layer ;

var clickedCountry ;

var triggerRegionsList = [];

var mapAdm0Color = '#F2645A',
    unselectedColor = '#EEEEEE',
    triggerRegionColor = '#e16f60',
    nonTriggerRegionColor = '#e1e7f5';
// Generate simple leaflet map 
function generateMap() {
    //map != undefined ? map.remove() : null;

    var mapboxAccessToken = 'pk.eyJ1IjoidGhhbXJpbmYiLCJhIjoiYzA1MmJjMzI1N2E5NzNhN2I2MzU4MDkzZWU4ODQxNzAifQ.3qQApYaqLA0bGC3Z5PCnUg';
    map = L.map('map');//.setView([6.859, 39.825], 5); //5/6.859/39.825

    L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token=' + mapboxAccessToken, {
        id: 'mapbox/light-v9',//'mapbox/traffic-day-v2',
        attribution: '<a href="http://mapbox.com">Mapbox</a>',
        tileSize: 512,
        zoomOffset: -1
    }).addTo(map);


    info = L.control();

    info.onAdd = function (map) {
        this._div = L.DomUtil.create('div', 'info'); // create a div with a class "info"
        this.update();
        return this._div;
    };

    // method that we will use to update the control based on feature properties passed
    info.update = function (props) {
        var html = (adm1Layer != undefined ? '<h4>Hover over</h4>' : '<h4>Select country</h4>');
        props ? html = '<h4>' + props.admin0Name + '</h4><b>Click to visualise</b>' : '';
        this._div.innerHTML = html ;

    };

    info.updateFromAdm1 = function (props) {
        var html = '';
        props ? html = '<h4>' + props.admin1Name + '</h4>' : '';
        this._div.innerHTML = html;

    };

    info.addTo(map);

    regionLayer = L.geoJSON(geomData, {
        style: styleLayers,
        onEachFeature: onEachFeature
    }).addTo(map);
    map.fitBounds(regionLayer.getBounds());
    regionLayer.id = 'regions';
} //generateMap

// for Region layers
function onEachFeature(feature, layer) {
    layer.on({
        mouseover: highlightFeature,
        mouseout: resetHighlight,
        click: mapClicked
    });
}

function onEachFeatureAdm1Layer(feature, layer) {
    layer.on({
        mouseover: highlightFeatureAdm1,
        mouseout: resetHighlight,
        // click: mapClicked
    });
} //onEachFeatureAdm1Layer


function styleLayers(feature) {
    return {
        // fillColor: mapAdm0Color,
        weight: 2,
        // opacity: 1,
        // color: 'blue',
        dashArray: '3',
        fillOpacity: 0
    };
}

function styleAdm1Layer(feature) {
    return {
        fillColor: getColor(feature.properties.admin1Name),
        weight: 1.5,
        // color: '#666',
        // dashArray: '',
        fillOpacity: 1
    };
} //styleAdm1Layer

// Regions Layer
function highlightFeature(e) {
    info.update(e.target.feature.properties);

}

// Adm1 Layer
function highlightFeatureAdm1(e) {
    info.updateFromAdm1(e.target.feature.properties);
}

function resetHighlight(e) {
    // regionLayer.resetStyle(e.target);
    info.update();
}//resetHighlight


function choroplethMap(feature) {
    // console.log(adm1Layer); test existence adm1Layer
    adm1Layer.eachLayer(function(layer){
        layer.setStyle({
            fillColor: getColor(layer.feature.properties.admin1Name),
            weight: 1.5,
            // color: '#666',
            // dashArray: '',
            fillOpacity: 1
        })
    });
    // console.log(triggerRegionsList);
}

function getColor(adm1) {
    var clr = triggerRegionsList.includes(adm1) ? triggerRegionColor : nonTriggerRegionColor ;
    return clr;
} //getColor
let globalSettingsUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRkpUZ6NCrL8qPXpPGs1ePGf9E44PeiVRcaPvTOvFR5EdizJ7pzyxAaFj-V7NHJP0q6R5KwUfYszpgd/pub?gid=0&single=true&output=csv';

let ethiopiaFSDataUrl = 'https://raw.githubusercontent.com/OCHA-DAP/pa-anticipatory-action/main/dashboard/data/foodinsecurity/ethiopia_foodinsec_trigger.csv';
let somaliaFSDataUrl = 'https://raw.githubusercontent.com/OCHA-DAP/pa-anticipatory-action/main/dashboard/data/foodinsecurity/somalia_foodinsec_trigger.csv';

let ethiopiaAdm1 = 'data/ethiopia.json';
let somaliaAdm1 = 'data/somalia.json';
let geodata = 'data/regions.json';

let globalSettings,
    dataDictionary = {};

let dateRanges = [],
    selectedDate;

let countryAdm1,
    countryFSData,
    countryRainfallData,
    keyMessages;

let dTable,
  dataType;

let defaultDataSource;

let map,
    regionLayer;
let geomData;


var hideTable = true;


$( document ).ready(function() {

  function getData() {
    Promise.all([
      d3.json(geodata),
      d3.csv(globalSettingsUrl)
      // d3.json(ethiopiaAdm1),
      // d3.json(somaliaAdm1),
      // d3.csv(ethiopiaDataUrl),
      // d3.csv(somaliaDataUrl)
    ]).then(function(data){
      geomData = topojson.feature(data[0], data[0].objects.regions);
      
      globalSettings = data[1];
      data[1].forEach(element => {
        // console.log(element);
        dateRanges.includes(element['Date']) ? '' : dateRanges.push(element['Date']);
      });

      d3.select("#selections")
        .selectAll("option")
        .data(dateRanges)
        .enter().append("option")
        .text(function (d) { return d; })
        .attr("value", function (d) { return d; });

      generateMap();
      
      //remove loader and show vis
      $('.loader').hide();
      $('main, footer').css('opacity', 1);
    });
    

  } //getData


  getData();
  //initTracking();
});


function mapClicked(e) {
  adm1Layer != undefined ? map.removeLayer(adm1Layer) : '';
  legend != undefined ? map.removeControl(legend) : null;
  cleanDataTable();
  dataType = "food_insec";
  $('.hide').css('opacity', 1);

  var layer = e.target;
  clickedCountry = layer.feature.properties.admin0Name;
  selectedDate = $('#selections').val();
  var adm1Url,
      fsUrl,
      rainfUrl;
  globalSettings.forEach(element => {
    if (element['Date'] == selectedDate && element['Countries'] == clickedCountry) {
      adm1Url = element['Adm1 data Link'];
      fsUrl = element['Data link'];
      rainfUrl = element['Rainfall data link'];
      keyMessages = element['Key Messages'];
      defaultDataSource = element['Default Source'];
    }
  });
  // a supprimer apres 
  clickedCountry == "Ethiopia" ? adm1Url = "data/ethiopia.json" : adm1Url = "data/somalia.json" ;
  //
  Promise.all([
    d3.json(adm1Url),
    d3.csv(fsUrl),
    d3.csv(rainfUrl)
  ]).then(function(data){
    clickedCountry == 'Ethiopia' ? countryAdm1 = topojson.feature(data[0], data[0].objects.ethiopia) :
      clickedCountry == 'Somalia' ? countryAdm1 = topojson.feature(data[0], data[0].objects.somalia) : '';

    countryFSData = data[1].filter(function(d) {
      return (d['date'] == selectedDate && d['source'] == defaultDataSource);
      });
    countryRainfallData = data[2].filter(function (d) {
      return d['pred_date'] == "2020-10-16" ;
    });
    // getPeriodeRanges();
    getTriggerRegions();
    generateKeyMessage();
    

    adm1Layer = L.geoJSON(countryAdm1, {
      style: styleAdm1Layer,
      onEachFeature: onEachFeatureAdm1Layer
    }).addTo(map);

    legend = L.control({ position: 'bottomright' });
    legend.onAdd = function (map) {
      var div = L.DomUtil.create('div', 'info legend');
      var html = '<h6>Show layer</h6>' +
        '<div class="radio"><label><input type="radio" name="optradio" value="food_insec" checked> FOOD INSECURITY</label></div>' +
        '<div class="radio"><label><input type="radio" name="optradio" value="rainfall"> DROUGHT</label></div>';
      div.innerHTML += html;

      return div;
    }

    legend.addTo(map);
    map.fitBounds(adm1Layer.getBounds());

    $("input[name='optradio']").on('change', function () {
      dataType = $('input[name="optradio"]:checked').val();
      updateMapLayer();
      !hideTable ? generateDataTable() : null;

    });

  });
} //mapClicked

function updateMapLayer() {
  getTriggerRegions();
  choroplethMap();
}//updateMapLayer

//Get and set for the selected country the period dropdown with the more recent date selected by default
function getPeriodeRanges(params) {
  var dates = [];
  countryData.forEach(element => {
    dates.includes(element['date']) ? '' : dates.push(element['date']);
  });
} //getPeriodeRanges

// Get trigger regions for Food Insecurity data
function getTriggerRegions(params) {
  triggerRegionsList = [];
  if (dataType == "food_insec") {
    countryFSData.forEach(element => {
      element['threshold_reached_ML1'] == "True" ? triggerRegionsList.push(element['ADMIN1']) : '';
    });
  } else if (dataType == "rainfall") {
    countryRainfallData.forEach(element => {
      element['threshold_reached'] == "0" ? triggerRegionsList.push(element['ADM1_EN']) : '';
    });
  }
}//getTriggerRegions

function generateKeyMessage() {
  // $('.key-message').html(""); tu peux toujours vider avant de recreer
  $('.key-message').html("");
  var html = '<h4> Key Message</h4><p>' + keyMessages +'</p>';
  $('.key-message').html(html);
} //generateKeyMessage

function generateDataTable() {
  var heads = dataType == 'food_insec' ? ["Source", "Admin1", "IPC3+", "Proj_IPC3+", "Change_IPC3+", "Proj_IPC4+", "Trigger_met"]:
    dataType == 'rainfall' ? ["Admin1", "Date", "Pred_date", "Pred_date_end", "Threshold(%)", "Threshold Reached"] : null;
  
  var fsPromise = new Promise(function (resolve, reject) {
    var dataFSp = [];
    countryFSData.forEach(element => {
      dataFSp.push([element['source'], element['ADMIN1'], element['ML1_3p'], element['perc_ML1_3p'], element['ML1_4p'], element['perc_ML2_4'], element['threshold_reached_ML1']]);
    });
    resolve(dataFSp)
  });

  var rainPromise = new Promise(function (resolve, reject) {
    var dataRainp = [];
    countryRainfallData.forEach(element => {
      dataRainp.push([element['ADM1_EN'], element['date'], element['pred_date'], element['pred_date_end'], element['perc_threshold'], element['threshold_reached']]);
    });
    resolve(dataRainp)
  });

  var thePromise = dataType == 'rainfall' ? rainPromise : fsPromise ;

  Promise.all([
    thePromise
  ]).then(function (data) {
    d3.select('#datatable').select("tr").selectAll("th").remove();
    d3.select('#datatable')
      .select('tr')
      .selectAll('th')
      .data(heads).enter()
      .append('th')
      .text(function (d) { return d; });

    if ($.fn.dataTable.isDataTable('#datatable')) {
      $('#datatable').dataTable().fnClearTable();
      $('#datatable').dataTable().fnDraw();
    } else {
      dTable = $('#datatable').DataTable({
        data: []
      });
    }
    $('#datatable').dataTable().fnAddData(data[0]);
  })

} //generateDataTable

$.fn.dataTable.ext.errMode = 'none';
function cleanDataTable() {
  if ($.fn.dataTable.isDataTable('#datatable')) {
    $('#datatable').dataTable().fnClearTable();
    dTable.destroy();
    d3.select('#datatable').select("tr").selectAll("th").remove();
  }
} //cleanDataTable

$('.btn').on('click', function () {
  if (hideTable) {
    generateDataTable();
    $('.btn').text("Hide table");
    $('#datatable').css('opacity', 1);
    hideTable = false;
  } else {
    cleanDataTable();
    $('.btn').text("Show data table");
    $('#datatable').css('opacity', 0);
    hideTable = true;
  }
});

$('#selections').on('change', function(){
  resetGlobalMap();
});


function resetGlobalMap() {
  //remove adm1Layer
  adm1Layer != undefined ? map.removeLayer(adm1Layer) : null;
  legend != undefined ? map.removeControl(legend) : null;
  
  //remove tables
  $('.hide').css('opacity', 0);
  $('.btn').text("Show data table");
  hideTable = true;
  cleanDataTable();
  
  //remove key messages
  $('.key-message').html("");
  
  map.fitBounds(regionLayer.getBounds());
} //resetGlobalMap

var date_sort = function (d1, d2) {
  if (d1 < d2) return 1;
  if (d1 > d2) return -1;
  return 0;
}

