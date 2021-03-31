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