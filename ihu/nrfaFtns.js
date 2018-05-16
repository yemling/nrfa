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
spiMap.tsChartData = [];
spiMap.drawMap = function()
{
	spiMap.stationID = wrUtils.getParameterByName('station');
	//set up the leaflet map at the UK boundary using mapbox.
	spiMap.drawSPIlayer();
	/* if(!(spiMap.stationID === null) && !isNaN(spiMap.stationID))
	{
		spiMap.createStationData();
	}	
	else {
		spiMap.getNRFAstations();
	}  */
	$('.toggleLayer').click(spiMap.toggleLayer);
	return;
}

spiMap.toggleLayer = function()
{
	var checkVal = $(this).val();
	if(checkVal === "grids")
	{
		layerName = "spiGrids";
	}
	else
	{
		if (ihuMap.map.getZoom() > 10)
		{
			layerName = "groups";
		}
		else
		{
			layerName = "areas";
		}
	}
	var mapLayer = wrUtils.getMapLayer(ihuMap.mapLayers.getLayers(),layerName);
	//show / hide the map layer.
	if(mapLayer.visible)
	{
		if(mapLayer.type === 'polygons')
		{
			mapLayer.setStyle({
				"opacity":0,
				"fillOpacity":0
			});
		}
		else
		{
			mapLayer.setOpacity(0);
		}
		mapLayer.visible = false;
	}
	else
	{
		if(mapLayer.type === 'polygons')
			{
				mapLayer.setStyle({
					"opacity":ihuMap.spiLayerOptions.opacity,
					"fillOpacity":ihuMap.spiLayerOptions.opacity
				});
			}
			else
			{
				mapLayer.setOpacity(ihuMap.spiLayerOptions.opacity);
			}
		mapLayer.visible = true;
	}
	return;
}
spiMap.drawSPIlayer = function()
{
	//add the SPI WMS layer
	var spiGrids = L.tileLayer.wms("https://eip.ceh.ac.uk/thredds/wms/public-historic-spi", {
		layers: 'SPI12_5km',
		format: 'image/png',
		transparent: true,
		version: '1.3.0',
		//crs: 'EPSG:27700',
		styles: 'boxfill/rdbu_inv',
		colorscalerange:'-4,4', 
		time:wrUtils.mapDates[0],
		width:579,	
		height:706,
		opacity:0.5,
		attribution: "Standard Precipitation Index - 12 months"
	}).addTo(ihuMap.map);
	spiGrids.visible = true;
	spiGrids.type = "grids";
	spiGrids.name = "spiGrids";
	ihuMap.mapLayers.addLayer(spiGrids);
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
		iconSize: [10, 10],
		iconAnchor: [15, 15],
		popupAnchor: [-7, -12]
	});
	return markerIcon;
}
spiMap.drawNRFAstations = function(json)
{
	//add all the NRFA stations to the map as a leaflet cluster layer.
	var markers = L.markerClusterGroup();
	//all markers json.data.length
	for(var m = 0; m < 100; m++)
	{
		var station = json.data[m];
		station.coords = [station["lat-long"].latitude, station["lat-long"].longitude];
		var marker = L.marker(station.coords, {title:station.name, icon:spiMap.setMarkerIcon(station["station-level"])});
		var markerPopup = $('<div><a href="home.html?station='+station.id+'" class="stationPopup">'+station.name+'</a></div>');
		markerPopup.on('click', '.stationPopup',spiMap.createStationData);
		marker.bindPopup(markerPopup[0]);
		ihuMap.map.addLayer(marker); // If don't want to cluster, uncomment this line
		//markers.addLayer(marker);
	};
	//ihuMap.map.addLayer(markers); // and comment out this line for no clustering.
	return;
}
spiMap.createStationData = function(ev)
{
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
	ihuMap.map.setView([stationInfo["lat-long"].latitude, stationInfo["lat-long"].longitude],10);
	var stationMarker = L.marker([stationInfo["lat-long"].latitude, stationInfo["lat-long"].longitude], {title:stationInfo["name"],icon:spiMap.setMarkerIcon(stationInfo["station-level"])}).addTo(ihuMap.map);
	ihuMap.map.invalidateSize();
	var stationHtml = '<h2>'+stationInfo["name"]+'</h2>';
	stationHtml += '<table>';
	stationHtml += '<tr><th>Catchment area</th><td>'+stationInfo["catchment-area"]+'</td></tr>';
	stationHtml += '<tr><th>Grid reference</th><td>'+stationInfo["grid-reference"].ngr+' ['+stationInfo["grid-reference"].easting+' ,'+stationInfo["grid-reference"].northing+']</td></tr>';
	stationHtml += '<tr><th>Location</th><td>'+stationInfo["location"]+'</td></tr>';
	stationHtml += '<tr><th>River</th><td>'+stationInfo["river"]+'</td></tr>';
	stationHtml += '<tr><th>Station level</th><td>'+stationInfo["station-level"]+'</td></tr>';
	stationHtml += '</table>';
	$('#stationDetails').html(stationHtml);
	spiMap.getTimeSeriesData(stationInfo.id);
}
spiMap.getTimeSeriesData = function(stationID)
{
	//get ts data to make graphs around the updated map
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
	if(graphData["data-stream"].length > 0)
	{
		spiMap.timeSetSeriesData(graphData["data-stream"],graphData["data-type"]["name"]);
	}
	return;
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
				if(startDate.length > 1)
				{
					label += '-' + startDate[2];
				}
				labels.push(label);
				values.push(cell);
			}  
		}
	}
	spiMap.tsChartData.push({x:labels, y:values,name:tsName, type:"bar"});
	return;
};
spiMap.drawPlotly = function()
{
	var tsGraph = document.getElementById('plotlyAllDiv');
	Plotly.plot(tsGraph, spiMap.tsChartData);
	/* if(spiMap.tsChartData.length > 0)
	{
		for(var i = 0; i<spiMap.tsChartData.length; i++)
		{
			var data = spiMap.tsChartData[i];
			$('#graphContainer').append('<div id="plotlyDiv'+i+'" class="chartContainer"></div>');
			var plotlyGraph = document.getElementById('plotlyDiv'+i);
			var layout = {title:data.name}
			Plotly.newPlot(plotlyGraph, [data],layout);
		}
	} */
	return;
}
spiMap.pageLoaded = function()
{
	spiMap.drawPlotly();
	return;
}
$(document).ajaxStop(spiMap.pageLoaded);