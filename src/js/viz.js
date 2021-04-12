let globalSettingsUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRkpUZ6NCrL8qPXpPGs1ePGf9E44PeiVRcaPvTOvFR5EdizJ7pzyxAaFj-V7NHJP0q6R5KwUfYszpgd/pub?gid=0&single=true&output=csv';
let staticDataUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRkpUZ6NCrL8qPXpPGs1ePGf9E44PeiVRcaPvTOvFR5EdizJ7pzyxAaFj-V7NHJP0q6R5KwUfYszpgd/pub?gid=1361707963&single=true&output=csv';

let ethiopiaAdm1 = 'data/ethiopia.json';
let somaliaAdm1 = 'data/somalia.json';
let geodata = 'data/regions.json';

let globalSettings,
    staticData,
    dataDictionary = {};

let dateRanges = [],
    selectedDate;

    let datePickeur;

let countryAdm1,
    countryFSData,
    globalCountryFSData,
    countryRainfallData,
    globalCountryRainfallData;

let dTable,
  dataType;

let defaultDataSource;

let pickDate;

let map,
    regionLayer;
let geomData;


var hideTable = true;
var nonDisplay = 1;

$( document ).ready(function() {

  function getData() {
    Promise.all([
      d3.json(geodata),
      d3.csv(globalSettingsUrl),
      d3.csv(staticDataUrl)
    ]).then(function(data){
      geomData = topojson.feature(data[0], data[0].objects.regions);
      globalSettings = data[1];
      staticData = data[2];

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
  pickDate != undefined ? pickDate = null : '';
  dateRanges = [];

  cleanDataTable();
  $('.btn').text("Show data table");
  dataType = "food_insec";

  clickedCountry = e.target.feature.properties.admin0Name;

  var adm1Url,
      fsUrl,
      rainfUrl;
  
  staticData.forEach(element => {
    if (element['country'] == clickedCountry) {
      fsUrl = element['FS data url'];
      rainfUrl = element['Rainfall data url'];
      adm1Url = element['Geodata url'];
      adminUnitLevel = element['Admin Unit Level'];
    }
  });
  // a supprimer apres 
  clickedCountry == "Ethiopia" ? adm1Url = "data/eth.json" : adm1Url = "data/som.json" ;
  //
  Promise.all([
    d3.json(adm1Url),
    d3.csv(fsUrl),
    d3.csv(rainfUrl)
  ]).then(function(data){
    countryAdm1 = topojson.feature(data[0], data[0].objects.geom) ;
   
    data[1].forEach(element => {
      element['ML1_3p'] = Number(element['ML1_3p']).toFixed(2);
      element['perc_ML1_3p'] = Number(element['perc_ML1_3p']).toFixed(2);
    });
    globalCountryFSData = data[1];
    globalCountryRainfallData = data[2];

    var dataSourcesArr = [];
    globalCountryFSData.forEach(element => {
      dateRanges.includes(element['date']) ? '' : dateRanges.push(element['date']);
      dataSourcesArr.includes(element['source']) ? '' : dataSourcesArr.push(element['source']);
    });

    // Date picker
    generateDatePicker(dateRanges);
    generateDataSourceOptions(dataSourcesArr);

    defaultDataSource = $('#source-selections').val();

    countryFSData = globalCountryFSData.filter(function(d) {
      return (d['date'] == selectedDate && d['source'] == defaultDataSource);
      });
    countryRainfallData = globalCountryRainfallData.filter(function (d) {
      return d['pred_date'] == selectedDate ;
    });
    

    getTriggerRegions();
    generateStaticHTML();
    

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
      updateSelects();
      updateMapLayer();
      !hideTable ? generateDataTable() : null;

    });

  });

  if (nonDisplay == 1) {
    $('#tutoriel').html('');
    $('.nodisplay').css({'opacity': 1, 'transition': 'opacity 2s ease'});
    nonDisplay += 1;
  }
  $('.hide').css({ 'opacity': 1, 'transition': 'opacity 2s ease' });

} //mapClicked

function updateMapLayer() {
  getTriggerRegions();
  choroplethMap();
}//updateMapLayer


function updateSelects() {

  var selectPromise = new Promise(function(resolve){
    var opts = [];
    globalCountryFSData.forEach(element => {
      opts.includes(element['source']) ? '' : opts.push(element['source']);
    });
    resolve(opts);
  });

  var fsPromise = new Promise(function(resolve) {
    var datesArr = [];
    globalCountryFSData.forEach(element => {
      datesArr.includes(element['date']) ? '' : datesArr.push(element['date']);
    });
    resolve(datesArr);
  });

  var rainfallPromise = new Promise(function (resolve) {
    var datesArr = [];
    globalCountryRainfallData.forEach(element => {
      datesArr.includes(element['date']) ? '' : datesArr.push(element['date']);
    });
    resolve(datesArr);
  });

  var thePromise = dataType == 'rainfall' ? rainfallPromise : fsPromise;

  Promise.all([thePromise, selectPromise]).then(function(data){
    generateDatePicker(data[0]);
    generateDataSourceOptions(data[1]);
  });
} //updateSelects

//Get and set for the selected country the period dropdown with the more recent date selected by default
function getPeriodeRanges() {
  var dates = [];
  var data = clickedCountry == "Ethiopia" ? ethiopiaFSData : somaliaFSData;
  data.forEach(element => {
    dates.includes(element['date']) ? '' : dates.push(element['date']);
  });
  return dates;
} //getPeriodeRanges



// Get trigger regions for Food Insecurity data
function getTriggerRegions(params) {
  triggerRegionsList = [];
  if (dataType == "food_insec") {
    if (adminUnitLevel == 'adm1') {
      countryFSData.forEach(element => {
        element['threshold_reached_ML1'] == "True" ? triggerRegionsList.push(element['ADMIN1']) : '';
      });
    } else {
      countryFSData.forEach(element => {
        (element['threshold_reached_ML1'] == "True" || element['threshold_reached_ML1'] ==  0)  ? triggerRegionsList.push(element['ADMIN0']) : '';
      });
    }
  } else if (dataType == "rainfall") {
    countryRainfallData.forEach(element => {
      element['threshold_reached'] == "0" ? triggerRegionsList.push(element['ADM1_EN']) : '';
    });
  }
}//getTriggerRegions


function generateDataSourceOptions(arr) {
  var options = '';

  if (dataType == 'rainfall') {
    for (let i = 0; i < arr.length; i++) {
      options += '<option value="' + arr[i] + '" disabled>' + arr[i] + '</option>'
    }

  } else {
    for (let i = 0; i < arr.length; i++) {
      arr[i] == 'FewsNet' ? options += '<option value="' + arr[i] + '" selected>' + arr[i] + '</option>' :
        options += '<option value="' + arr[i] + '">' + arr[i] + '</option>';
    }
  }

  $('#source-selections').html(options);
} //generateDataSourceOptions

function generateDatePicker(validDatesArr) {
  pickDate != undefined ? $('#datepicker').datepicker('destroy') : null;

  var maxDate = d3.max(validDatesArr, function (d) { return d; }),
    minDate = d3.min(validDatesArr, function (d) { return d; });
  pickDate = $('#datepicker').datepicker({
    showButtonPanel: true,
    dateFormat: 'yy-mm-dd',
    minDate: minDate,
    maxDate: maxDate,
    beforeShowDay: function valideDate(date) {
      var year = date.getFullYear();
      var day = ("0" + date.getDate()).slice(-2)
      var month = ("0" + (date.getMonth() + 1)).slice(-2)

      var testDate = year + '-' + month + '-' + day;

      if (validDatesArr.includes(testDate)) {
        return day;
      } else {
        return false;
      }
    }
  });
  selectedDate = maxDate;
  $("#datepicker").datepicker("setDate", maxDate);
} //generateDatePicker

function generateStaticHTML() {
  var food_insec_def,
      drought_def,
      keyMessages;

  var datesArr = ['default'];
  globalSettings.forEach(element => {
    datesArr.includes(element['Date']) ? null : datesArr.push(element['Date']);
  });
  if (datesArr.includes(selectedDate)) {
    globalSettings.forEach(element => {
      (element['Date'] == selectedDate && element['Countries'] == clickedCountry) ? keyMessages = element['Key Messages'] : null;
    });
  } else {
    var f = globalSettings.filter(function (d) { return (d['Date'] == 'default' && d['Countries'] == clickedCountry) ;})
    keyMessages = f[0]['Key Messages'];
  }
  staticData.forEach(element => {
    if (element['country'] == clickedCountry) {
      food_insec_def = element['FS trigger definition'];
      drought_def = element['Rainfall trigger definition'];
    }
  });
  // triggers definition 
  var definitions = '<h4>Trigger definition</h4><h5>Food Insecurity</h5>';
  definitions += '<p>' + food_insec_def + '</p>' 
    + '<h5>Drought</h5>'
    + '<p>' + drought_def + '</p>';

  $('.triggers-definition').html(definitions);
  $('.key-message').html("");
  var html = '<h4> Key Message</h4><p>' + keyMessages +'</p>';
  $('.key-message').html(html);
} //generateKeyMessage

function generateDataTable() {
  var heads = dataType == 'food_insec' ? ["Date", "Source", "Proj_IPC3+", "Change_IPC3+", "Proj_IPC4+", "Trigger_met"]:
    dataType == 'rainfall' ? ["Admin1", "Date", "Pred_date", "Pred_date_end", "Threshold(%)", "Threshold Reached"] : null;
  
  var fsPromise = new Promise(function (resolve, reject) {
    var dataFSp = [];
    countryFSData.forEach(element => {
      dataFSp.push([element['date'], element['source'], element['perc_ML1_3p'], element['ML1_4p'], element['perc_ML2_4'], element['threshold_reached_ML1']]);
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
        data: [],
        "bFilter": false,
        "bLengthChange": false,
        "pageLength": 20,
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
    $('#datatable').css({ 'opacity': 1, 'transition': 'opacity 2s' });
    hideTable = false;
  } else {
    cleanDataTable();
    $('.btn').text("Show data table");
    $('#datatable').css({ 'opacity': 0, 'transition': 'opacity 2s' });
    hideTable = true;
  }
});

$('#selections').on('change', function(){
  resetGlobalMap();
});

// date picker date changed
$("#datepicker").on('change', function(d){
  selectedDate = $('#datepicker').val();
  if (dataType == 'food_insec') {
    //update food insecu country data
    countryFSData = globalCountryFSData.filter(function (d) {
      return (d['date'] == selectedDate && d['source'] == defaultDataSource);
    });
  } else {
    //update rainfall country data
    countryRainfallData = globalCountryRainfallData.filter(function (d) {
      return d['date'] == selectedDate;
    });
  }
  
  updateMapLayer();
  !hideTable ? generateDataTable() : null;
});

$('#source-selections').on('change', function(d){
  defaultDataSource = $('#source-selections').val();
  selectedDate = $('#datepicker').val();

  countryFSData = globalCountryFSData.filter(function (d) {
    return (d['date'] == selectedDate && d['source'] == defaultDataSource);
  });

  updateMapLayer();
  !hideTable ? generateDataTable() : null;
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

