var spiMap = {};
spiMap.nrfaWMS = 'http://nrfaapps.ceh.ac.uk/nrfa/ws';
//copied these from http://nrfaapps.ceh.ac.uk/nrfa/nrfa-api.html#parameter-data-type so can use them to get info about a particular station.
spiMap.nrfaDataTypes = [
	{id:"gdf",name:"Gauged daily flows"},
	{id:"ndf",name:"Naturalised daily flows"},
	{id:"gmf",name:"Gauged monthly flows"},
	{id:"nmf",name:"Gauged daily flows"},
	{id:"cmr",name:"Catchment monthly rainfall"},
	{id:"pot-stage",name:"Peaks over threshold stage"},
	{id:"pot-flow",name:"Peaks over threshold flow"},
	{id:"gauging-stage",name:"Gauging stage"},
	{id:"gauging-flow",name:"Gauging flow"},
	{id:"amax-stage",name:"Annual maxima stage"},
	{id:"amax-flow",name:"Annual maxima flow"}
];
spiMap.countyFiles = [
	{name:'England and Wales', url:'docs/Census_Merged_Local_Authority_Districts_December_2011_Super_Generalised_Clipped_Boundaries_in_Great_Britain.geojson',areaRef:'cmlad11nm'},
	{name:'Scotland', url:'docs/Scottish_Parliamentary_Regions_May_2016_Generalised_Clipped_Boundaries_in_Scotland.geojson',areaRef:'spr16nm'}
]
spiMap.dataTypeCounter = 0;
spiMap.tsChartData = [];
spiMap.tsChartData.xyData = [];
spiMap.getParameterByName = function(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}
spiMap.init = function()
{
	//jQuery sliders for the opacity and month options.
	var opacityHandle = $( "#opacity-handle" );
	var monthHandle = $( "#month-handle" );
	$( "#mapDates" ).slider({ 
		min: 0, 
		max: wrUtils.mapDates.length-1, 
		create: function() {
			monthHandle.text( wrUtils.formatDate($( this ).slider( "value" )) );
		},
		slide: function(e,ui){
			monthHandle.text( wrUtils.formatDate(ui.value) );
			spiMap.eipTileLayer.setParams({'time':wrUtils.mapDates[ui.value]});
		}                
	});
	$( "#monthStart" ).text(wrUtils.formatDate(0));
	$( "#monthEnd" ).text(wrUtils.formatDate(wrUtils.mapDates.length-1));
	$( "#mapOpacity" ).slider({ 
		min: 0, 
		max: 1,
		step:0.1,
		value:0.5,
		create: function() {
			opacityHandle.text($( this ).slider( "value" ));
		},		
		slide: function(e,ui){
			opacityHandle.text(ui.value);
			spiMap.eipTileLayer.setOpacity(ui.value);
		}                
	});
	spiMap.drawCanvasJs();
	spiMap.drawChartJS();
	spiMap.drawDyGraph();
	spiMap.drawMap();
	
	return;
}
spiMap.drawMap = function()
{
	spiMap.stationID = wrUtils.getParameterByName('station');
	//set up the leaflet map at the UK boundary using mapbox.
	spiMap.map = L.map('mapid').setView([55.5, -2.5], 5);
	spiMap.osMap = L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
    attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
    id: 'mapbox.streets',
    accessToken: 'pk.eyJ1IjoiZ2VtbWF2bmFzaCIsImEiOiJjamdwNjR5YzMwZTc5MndtZDJteDFpY3lwIn0.3Exi_QhPZuuxHRcBXmpo5A'
}).addTo(spiMap.map);
	spiMap.getCountyBoundaries();
	spiMap.drawSPIlayer();
	if(!(spiMap.stationID === null) && !isNaN(spiMap.stationID))
	{
		spiMap.createStationData();
	}	
	else {
		spiMap.getNRFAstations();
	}
	
	return;
}
spiMap.getCountyBoundaries = function()
{
	for (var c = 0; c < spiMap.countyFiles.length; c++)
	{
		var county = spiMap.countyFiles[c];
		//put the county boundaries on the map with a button to toggle them.
		$.ajax({
			url:county.url,
			data:{areaRef:county.areaRef},
			processData :false,
			success:spiMap.drawCountyBoundaries,
			error: function(jqXHR,textStatus,errorThrown){
				alert('Error requesting county data from server due to ['+textStatus+']')
			}
		});
	}
	$('#toggleCounties').click(spiMap.toggleCounties);
	return;
}
spiMap.toggleCounties = function()
{
	//show / hide the counties layer.
	if(spiMap.counties.visible)
	{
		spiMap.counties.setStyle({
			"opacity":0,
			"fillOpacity":0
		});
		spiMap.counties.visible = false;
	}
	else
	{
		spiMap.counties.setStyle({
			"opacity":0.5,
			"fillOpacity":0.2
		});
		spiMap.counties.visible = true;
	}
	return;
}
spiMap.drawCountyBoundaries = function(json)
{
	//use the Leaflet geosjon function read and output the county boundaries from the local file.
	spiMap.counties = L.geoJSON(json, {
		onEachFeature: spiMap.onEachFeatureClosure(this.data.areaRef)
	}).addTo(spiMap.map);
	spiMap.counties.visible = true;
	return;
}
spiMap.onEachFeatureClosure = function(areaRef) {
	//using this closure to send through areaRef (which is the name of the county) so can bind the popup accordingly.
    return function onEachFeature(feature, layer) {
		// does this feature have a property with the areaRef sent through?
		if (feature.properties && feature.properties[areaRef]) {
			layer.bindPopup(feature.properties[areaRef]);
		}
		layer.setStyle({
			"fillColor": wrUtils.randomColor(), 
			"weight": 1,
			"fillOpacity": 0.2,
			"opacity": 0.5
		});
		return;
    }
}
wrUtils.randomColor = function()
{
	return '#'+(Math.random()*0xFFFFFF<<0).toString(16);
}
spiMap.drawSPIlayer = function()
{
	//add the SPI WMS layer
	spiMap.eipTileLayer = L.tileLayer.wms("https://eip.ceh.ac.uk/thredds/wms/public-historic-spi", {
		layers: 'SPI12_5km',
		format: 'image/png',
		transparent: true,
		version: '1.3.0',
		//crs: 'EPSG:27700',
		styles: 'boxfill/rdbu_inv',
		colorscalerange:'-4,4',
		time:'2018-03-01T00:00:00.000Z',
		width:579,	
		height:706,
		opacity:0.5,
		attribution: "Standard Precipitation Index - 12 months"
	}).addTo(spiMap.map);
	return;
}
spiMap.getNRFAstations = function()
{
	//get tje NRFA json for all stations.
	var stationUrl = spiMap.nrfaWMS + '/station-info?station=*&format=json-object&fields=id,name,lat-long,station-level';
	$.ajax({
		url:stationUrl,
		crossdomain:true,
		jsonp: "callback",
		dataType:"jsonp",
		success:spiMap.drawNRFAstations,
		error: function(jqXHR,textStatus,errorThrown){
			alert('Error requesting station array data from server due to ['+textStatus+']')
		}
	});
	return;
}
spiMap.setMarkerIcon = function(stationLevel)
{
	var redIcon = '/i/images/redicon.png';
	var blueIcon = '/i/images/blueicon.png';
	if(stationLevel > 50)
	{
		iconSrc = redIcon;
	}
	else
	{
		iconSrc = blueIcon;
	}
	var markerIcon = L.icon({
		iconUrl: iconSrc,
		iconSize: [25, 41],
		iconAnchor: [25, 41],
		popupAnchor: [-3, -41]
	});
	return markerIcon;
}
spiMap.drawNRFAstations = function(json)
{
	//add all the NRFA stations to the map as a leaflet cluster layer.
	var markers = L.markerClusterGroup();
	for(var m = 0; m < json.data.length; m++)
	{
		var station = json.data[m];
		station.coords = [station["lat-long"].latitude, station["lat-long"].longitude];
		var marker = L.marker(station.coords, {title:station.name, icon:spiMap.setMarkerIcon(station["station-level"])});
		var markerPopup = $('<div><a href="home.html?station='+station.id+'" class="stationPopup">'+station.name+'</a></div>');
		markerPopup.on('click', '.stationPopup',spiMap.createStationData);
		marker.bindPopup(markerPopup[0]);
		//spiMap.map.addLayer(marker); // If don't want to cluster, uncomment this line
		markers.addLayer(marker);
	};
	spiMap.map.addLayer(markers); // and comment out this line for no clustering.
	return;
}
spiMap.createStationData = function(ev)
{
	$('#stationTimeSeriesData').empty();
	$('#stationTimeSeriesData').append('<div id="timeSeriesAccordion" />');
	if(!!ev)
	{
		ev.preventDefault();
	}
	var station = {};
	if(!!$(this).attr('href'))
	{
		station.href = $(this).attr('href');
		station.id = station.href.substring(station.href.indexOf('=')+1,station.href.length);
	}
	else
	{
		station.id = spiMap.stationID;
	}
	//redraw the map at the station level.
	$('#mapid').addClass('station');
	//get the details about the station
	$.ajax({
		url:spiMap.nrfaWMS+'/station-info?station='+station.id+'&format=json-object&fields=id,name,lat-long,catchment-area,grid-reference,river,location,station-level,catchment-properties',
		crossdomain:true,
		jsonp: "callback",
		dataType:"jsonp",
		success:spiMap.outputStationDetails,
		error: function(jqXHR,textStatus,errorThrown){
			alert('Error requesting station detail data from server due to ['+textStatus+']')
		}
	});
	return;
}
spiMap.outputStationDetails = function(stationDetails)
{
	var stationInfo = stationDetails.data[0];
	spiMap.map.setView([stationInfo["lat-long"].latitude, stationInfo["lat-long"].longitude],10);
	var stationMarker = L.marker([stationInfo["lat-long"].latitude, stationInfo["lat-long"].longitude], {title:stationInfo["name"],icon:spiMap.setMarkerIcon(stationInfo["station-level"])}).addTo(spiMap.map);
	spiMap.map.invalidateSize();
	var stationHtml = '<h2>'+stationInfo["name"]+'</h2>';
	stationHtml += '<table>';
	stationHtml += '<tr><th>Catchment area</th><td>'+stationInfo["catchment-area"]+'</td></tr>';
	stationHtml += '<tr><th>Grid reference</th><td>'+stationInfo["grid-reference"].ngr+' ['+stationInfo["grid-reference"].easting+' ,'+stationInfo["grid-reference"].northing+']</td></tr>';
	stationHtml += '<tr><th>Location</th><td>'+stationInfo["location"]+'</td></tr>';
	stationHtml += '<tr><th>River</th><td>'+stationInfo["river"]+'</td></tr>';
	stationHtml += '<tr><th>Station level</th><td>'+stationInfo["station-level"]+'</td></tr>';
	stationHtml += '</table>';
	$('#stationDetails').html(stationHtml);
	var catchmentHtml = '<h3>Catchment properties</h3>';
	catchmentHtml += '<div id="cp_accordion">';
		for (var p = 0; p < stationInfo["catchment-properties"].groups.length; p ++)
		{
			var cp = stationInfo["catchment-properties"].groups[p];
			catchmentHtml += '<h4>'+cp.group.title+'</h4>';
			catchmentHtml += '<div>';
			catchmentHtml += '<p>'+cp.group.description+'</p>';
			if(cp.values.length > 0)
			{
				catchmentHtml += '<table>';
				catchmentHtml += '<tr><th>Item</th><th>Value</th><th>Method</th></tr>';
				for (var v = 0; v < cp.values.length; v ++)
				{
					var cpItem = cp.values[v];
					catchmentHtml += '<tr><td>'+cpItem.item+'</td><td>'+cpItem.value+'</td><td>'+cpItem.method+'</td></tr>';
				}
				catchmentHtml += '</table>';
			}
			catchmentHtml += '</div>';
		}
	catchmentHtml += '</div>';
	$('#stationCatchments').html(catchmentHtml);
	$( "#cp_accordion" ).accordion({heightStyle: "content", active:false, collapsible:true});
	spiMap.getTimeSeriesData(stationInfo.id);
}
spiMap.getTimeSeriesData = function(stationID)
{
	$('#tsHeader').show();
	//add data graphs around the updated map
	for(var d=0; d<spiMap.nrfaDataTypes.length; d++)
	{
		var dataset = spiMap.nrfaDataTypes[d];
		$.ajax({
			url:spiMap.nrfaWMS+'/time-series?format=json-object&data-type='+dataset.id+'&station='+stationID,
			crossdomain:true,
			jsonp: "callback",
			dataType:"jsonp",
			success:spiMap.createTimeSeriesInfo,
			error: function(jqXHR,textStatus,errorThrown){
				alert('Error requesting time series data from server due to ['+textStatus+']')
			}
		}); 
	}
	return;
}
spiMap.createTimeSeriesInfo = function(graphData)
{
	var graphHtml = '<h4>'+graphData["data-type"]["name"]+'</h4>';
	graphHtml += '<div>';
		graphHtml += '<table>';
		graphHtml += '<tr><th>Parameter</th><td>'+graphData["data-type"]["parameter"]+'</td></tr>';
		graphHtml += '<tr><th>Units</th><td>'+graphData["data-type"]["units"]+'</td></tr>';
		graphHtml += '<tr><th>Measurement type</th><td>'+graphData["data-type"]["measurement-type"]+'</td></tr>';
		graphHtml += '<tr><th>Timestamp</th><td>'+graphData.timestamp+'</td></tr>';
		graphHtml += '<tr><th>Interval</th><td>'+graphData.interval+'</td></tr>';
	graphHtml += '</div>';
	if(graphData["data-stream"].length > 0 && graphData["data-type"]["name"].indexOf('Monthly') !=-1)
	{
		//'+spiMap.dataTypeCounter+'
		graphHtml += '<p><a href="#chartCanvasContainer">View chart</a></p>';
		spiMap.timeSetSeriesData(graphData["data-stream"],graphData["data-type"]["name"]);
		spiMap.dataTypeCounter = spiMap.dataTypeCounter + 1;
	}
	$('#timeSeriesAccordion').append(graphHtml);
}
spiMap.timeSetSeriesData = function(tsData,tsName)
{
	var monthCounter = 0;
	if(tsData[0].indexOf('-'))//can't make a graph if we don't know the start date of the series.
	{
		var labels = [];
		var values = [];
		var canvasJs = [];
		var dyGraph = [];
		var startDate = tsData[0].split('-');
		for (var d=0; d<tsData.length; d++)
		{
			var cell = tsData[d];
			if(cell.toString().search("-") === -1)
			{
				if(monthCounter < 11)
				{
					startDate[1] = parseFloat(startDate[1]) + 1;
					monthCounter = monthCounter + 1;
				}
				else if (monthCounter > 10)
				{
					monthCounter = 0;
					startDate[0] = parseFloat(startDate[0]) + 1;
					startDate[1] = 1;
				}
				var label = startDate[0] + '-' + startDate[1];
				labels.push(label);
				values.push(cell);
				//stupid canvas.js can't understand strings, so have to pass in a date.
				canvasJs.push({x:new Date(startDate[0],startDate[1],1),y:cell});
				dyGraph.push([new Date(startDate[0],startDate[1],1),cell]);
			}  
		}
	}
	spiMap.tsChartData.push({x:labels, y:values,name:tsName, type:"bar"});
	if(spiMap.chartJsChart.data.labels.length === 0)
	{
		spiMap.chartJsChart.data.labels = labels;
	}
	spiMap.chartJsChart.data.datasets.push({label:tsName, data:values, backgroundColor:wrUtils.randomColor()});
	spiMap.chartJsChart.update();
	spiMap.canvasJsChart.options.data.push({type:"column",dataPoints:canvasJs});
	spiMap.canvasJsChart.render();
	console.log(spiMap.dyGraph.file_);
	spiMap.dyGraph.updateOptions( { 'file': dyGraph } );
	return;
};

spiMap.drawPlotly = function()
{
	var tsGraph = document.getElementById('plotlyDiv');
	Plotly.newPlot(tsGraph, spiMap.tsChartData);
	return;
}
spiMap.drawCanvasJs = function()
{
	spiMap.canvasJsChart = new CanvasJS.Chart("canvasJsDiv", {
		title:{
			text: "Canvas JS"              
		},
		data:[]
	});
	spiMap.canvasJsChart.render();
	return;
}
spiMap.drawChartJS = function()
{
	//chart.js
	$('#chartJsDiv').append('<canvas id="timeSeriesChart'+spiMap.dataTypeCounter+'"></canvas>');
	var ctx = document.getElementById("timeSeriesChart"+spiMap.dataTypeCounter).getContext('2d');
	spiMap.chartJsChart = new Chart(ctx, {
		type: 'bar',
		options: {
			 zoom: {
				enabled: true,
				mode: 'x',
				limits: {
					max: 10,
					min: 0.5
				}
			}, 
			responsive: true,
			scales: {
				xAxes: [{
					ticks: {
						source: 'labels'
					}
				}],
				yAxes: [{
					ticks: {
						beginAtZero:true
					}
				}]
			}
		}
	});
}
spiMap.drawDyGraph = function ()
{
	spiMap.dyGraph = new Dygraph(document.getElementById("dyGraphDiv"), [],
	  {
		drawPoints: true,
		showRoller: true,
		showRangeSelector: true,
		labels: ['Time', 'Value']
	  });
}
spiMap.pageLoaded = function()
{
	if($( "#timeSeriesAccordion" ).has('h4').length)
	{
		$( "#timeSeriesAccordion" ).accordion({heightStyle: "content", active:false, collapsible:true});
	}
	spiMap.drawPlotly();
	return;
}
$(document).ready(spiMap.init);
$(document).ajaxStop(spiMap.pageLoaded);