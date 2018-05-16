var ihuMap = {};
ihuMap.areaFiles = [
	{name:'areas', url:'docs/ihu_areas_nc.json',areaName:'HA_NAME',spiFolder:'spi_class_ha_months',filePrefix:'spi_class_',spiID:'HA',ihuID:"HA_NUM"},
	{name:'groups', url:'docs/ihu_groups.json',areaName:'G_NAME', spiFolder:'spi_class_group_months',filePrefix:'spi_group_class_',spiID:'GROUP',ihuID:"G_DS_ID"}
];
ihuMap.mapLayers = L.layerGroup();
ihuMap.SPIkey = [
	{id:0,color:"#C14055",name:"Extremely dry (SPI below -2.0)"},
	{id:1,color:"#DD7F73",name:"Severely dry (SPI from -2.0 to -1.5)"},
	{id:2,color:"#F6B79D",name:"Moderately dry (SPI from -1.5 to -1.0)"},
	{id:3,color:"#FDE3D4",name:"Mildly dry (SPI From -1.0 to 0.0)"},
	{id:4,color:"#DAEAF3",name:"Mildly wet (SPI from 0.0 to 1.0)"},
	{id:5,color:"#A8D1E5",name:"Moderately wet (SPI from 1.0 to 1.5)"},
	{id:6,color:"#6DA9CD",name:"Severely wet (SPI from 1.5 to 2.0)"},
	{id:7,color:"#4F85BB",name:"Extremely wet (SPI above 2.0)"}
];
ihuMap.spiPeriods = [
	{id:0,value:1},
	{id:1,value:3},
	{id:2,value:6},
	{id:3,value:12},
	{id:4,value:18},
	{id:5,value:24}
];
ihuMap.spiLayerOptions = {
		period:3,
		opacity:0.8,
		dateIndex:0
}
ihuMap.spiClasses = [];
//set the defaults for the SPI map to be overwritten onclick later.
ihuMap.init = function()
{
	 var $loading = $('#bowlG').hide();
    //ajax feedback
    $(document)
        .ajaxStart(function() {
            $loading.fadeIn();
            $('#loadingBackground').addClass('loading');
        })
        .ajaxStop(function() {
            $loading.fadeOut();
            $('#loadingBackground').removeClass('loading');
    });
	//jQuery sliders for the opacity and month options.
	var opacityHandle = $( "#opacity-handle" );
	var monthHandle = $( "#month-handle" );
	var spiGridLayer = wrUtils.getMapLayer(ihuMap.mapLayers.getLayers(),'spiGrids');
	//map dates slider
	$( "#mapDates" ).slider({ 
		min: 0, 
		max: wrUtils.mapDates.length-1, 
		create: function() {
			monthHandle.text(wrUtils.formatDate($( this ).slider( "value" )).shortDate);
			monthHandle.attr('title',wrUtils.formatDate($( this ).slider( "value" )).shortDate);
		},
		slide: function(e,ui){
			monthHandle.text(wrUtils.formatDate(ui.value).shortDate);
			monthHandle.attr('title',wrUtils.formatDate(ui.value).shortDate);
			ihuMap.spiLayerOptions.month = wrUtils.formatDate(ui.value).yearMon;
			ihuMap.spiLayerOptions.dateIndex = ui.value;
			ihuMap.getSPIclasses();
			if(spiGridLayer)
			{
				spiGridLayer.setParams({'time':wrUtils.mapDates[ui.value]});
			}
		}                
	});
	$( ".monthStart" ).text(wrUtils.formatDate(0).shortDate);
	$( ".monthEnd" ).text(wrUtils.formatDate(wrUtils.mapDates.length-1).shortDate);
	//opacity slider
	$( "#mapOpacity" ).slider({ 
		min: 0, 
		max: 1,
		step:0.1,
		value:0.5,
		create: function() {
			opacityHandle.text($( this ).slider( "value" ));
		},		
		slide: function(e,ui){
			ihuMap.spiLayerOptions.opacity = ui.value;
			opacityHandle.text(ihuMap.spiLayerOptions.opacity);
			if(!!spiGridLayer && spiGridLayer.visible)
			{
				spiGridLayer.setOpacity(ihuMap.spiLayerOptions.opacity);
			}
			ihuMap.updateSPIoptions();
		}                
	});
	ihuMap.drawMap();
	$('.spiPeriod').click(ihuMap.updateSPIoptions);
	return;
}

ihuMap.drawMap = function()
{
	ihuMap.stationID = wrUtils.getParameterByName('station');
	//set up the leaflet map at the UK boundary using mapbox.
	ihuMap.map = L.map('mapid');
	ihuMap.osMap = L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
		attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
		id: 'mapbox.streets',
		accessToken: 'pk.eyJ1IjoiZ2VtbWF2bmFzaCIsImEiOiJjamdwNjR5YzMwZTc5MndtZDJteDFpY3lwIn0.3Exi_QhPZuuxHRcBXmpo5A'
	}).addTo(ihuMap.map);
	ihuMap.map.setView([55.5, -2.5], 5);
	//output the map key
	for(var i=0; i<ihuMap.SPIkey.length;i++)
	{
		var detail = ihuMap.SPIkey[i];
		$('#mapKey').append('<p><span style="background-color:'+detail.color+'">&nbsp;</span> '+detail.name+'</p>');
	}
	$('.spiPeriod').eq(ihuMap.spiLayerOptions.period-1).addClass('highlighted');
	spiMap.drawMap();
	ihuMap.zoomBasedLayerChange();
	return;
}

ihuMap.zoomBasedLayerChange = function()
{
	ihuMap.map.eachLayer(function (layer) {
        if (layer instanceof L.GeoJSON)
        {
            ihuMap.map.removeLayer(layer);
        }
    });
	if(ihuMap.map.getZoom() > 6)
	{
		ihuMap.visibleLayer = 'groups';
	}
	else 
	{
		ihuMap.visibleLayer = 'areas';
	}
	var ihuArea = $.grep(ihuMap.areaFiles, function(obj){ 
			return (obj.name === ihuMap.visibleLayer);
	})[0];
	ihuMap.getIHUpolygons(ihuArea);
	return;
}

ihuMap.getIHUpolygons = function(ihuArea)
{
	//put the boundaries on the map with a button to toggle them.
	$.ajax({
		url:ihuArea.url,
		data:{areaRef:ihuArea.areaName,layerName:ihuArea.name,ihuID:ihuArea.ihuID},
		processData :false,
		success:ihuMap.drawAreaBoundaries,
		error: function(jqXHR,textStatus,errorThrown){
			alert('Error requesting area data from server due to ['+textStatus+']')
		}
	});
	return;
}
ihuMap.drawAreaBoundaries = function(json)
{
	//use the Leaflet geosjon function read and output the county boundaries from the local file.
	var mapLayer = L.geoJSON(json, {
		style: {
			weight : 1,
			fillOpacity : ihuMap.spiLayerOptions.opacity,
			opacity : ihuMap.spiLayerOptions.opacity,
			color: '#fff',
			fillColor:'#00FF00'
		},
		onEachFeature: ihuMap.onEachFeatureClosure(this.data.areaRef,this.data.ihuID)
	});
	mapLayer.visible = false;
	mapLayer.name = this.data.layerName;
	mapLayer.type = 'polygons';
	mapLayer.dataFolder = this.data.dataFolder;
	mapLayer.areaRef = this.data.areaRef;
	mapLayer.ihuID = this.data.ihuID;
	ihuMap.visibleLayer = mapLayer.name;
	mapLayer.addTo(ihuMap.map);
	mapLayer.visible = true;
	ihuMap.mapLayers.addLayer(mapLayer);
	ihuMap.getSPIclasses();
	return;
}

//highlighting: https://leafletjs.com/examples/choropleth/
ihuMap.onEachFeatureClosure = function(areaRef,ihuID) {
	//using this closure to send through areaRef (which is the name of the county) so can bind the popup accordingly.
    return function onEachFeature(feature, layer) {
		layer.on({
			mouseover: ihuMap.highlightFeature,
			mouseout: ihuMap.resetHighlight,
			click : ihuMap.getSpiStatistics
		});
		//, click: ihuMap.zoomToFeature -- I don't like this.
		// does this feature have a property with the areaRef sent through?
		if (feature.properties && feature.properties[areaRef]) {
			feature.properties.areaRef = feature.properties[areaRef];
			layer.bindPopup(feature.properties[areaRef]);
		}
		if (feature.properties && feature.properties[ihuID]) {
			feature.properties.ihuID = feature.properties[ihuID];
			ihuMap.updatePolygonStyle(feature,layer);
		}
		return;
    }
}

ihuMap.highlightFeature = function(e) {
    var layer = e.target;
	var layerStyle ={};
	var layerOptions = layer.options;
	layerStyle.fillColor = layerOptions.fillColor;
	layerStyle.color = "#000";
	layerStyle.weight = 1;
	layerStyle.fillOpacity = ihuMap.spiLayerOptions.opacity;
	layerStyle.opacity = ihuMap.spiLayerOptions.opacity;
    layer.setStyle(layerStyle); 

    if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
        layer.bringToFront();
    }
	return;
}
ihuMap.resetHighlight = function(e) {
	var layer = e.target;
	/* 
	This won't work since the layer colors are adding after L.geojson layer loaded.
	var ihuArea = wrUtils.getMapLayer(ihuMap.mapLayers.getLayers(),ihuMap.visibleLayer);
	ihuArea.resetStyle(layer); */
	var layerStyle ={};
	var layerOptions = layer.options;
	layerStyle.fillColor = layerOptions.fillColor;
	layerStyle.color = "#fff";
	layerStyle.weight = 1;
	layerStyle.fillOpacity = ihuMap.spiLayerOptions.opacity;
	layerStyle.opacity = ihuMap.spiLayerOptions.opacity;
    layer.setStyle(layerStyle);

    if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
        layer.bringToFront();
    }
	return;
}
ihuMap.zoomToFeature = function(e) {
    ihuMap.map.fitBounds(e.target.getBounds());
	return;
}
ihuMap.updatePolygonStyle = function(feature,layer)
{ 
    var featureColor = '#00FF00';
	if (feature.properties && feature.properties["ihuID"]) {
		featureColor = ihuMap.getSPIcolor(feature.properties["ihuID"],layer);
		layer.setStyle({
			color:"#fff",
			fillColor : featureColor
		}); 
	}
	return;
}

ihuMap.getSPIcolor = function(HaNum,layer)
{
	var monthData = ihuMap.getSPIforVisibleMonth();
	if(typeof monthData != 'undefined')
	{
		if(monthData.values.length > 0)
		{
			var spiID = wrUtils.getMapLayer(ihuMap.areaFiles,ihuMap.visibleLayer).spiID;
			//get the SPI json data for the chosen end month (defined by month slider) and month period of 1,3,6,12,18,24.
			for(var d = 0; d<monthData.values.length; d++)
			{
				var spiDetails = monthData.values[d];
				if(spiDetails[spiID] == HaNum)
				{
					return ihuMap.SPIkey[spiDetails.SPI[ihuMap.spiLayerOptions.period]-1].color;
					break;
				}
			}
		}
		else
		{
			return '#00FF00';
		}
	}
	else
	{
		var ihuArea = wrUtils.getMapLayer(ihuMap.mapLayers.getLayers(),ihuMap.visibleLayer);
		if(typeof ihuArea != 'undefined')
		{
			ihuArea.resetStyle(layer);
		}
	}
	return;
};

ihuMap.getSPIforVisibleMonth = function()
{
	return $.grep(ihuMap.spiClasses, function(obj){ 
		var identified = (obj.month === ihuMap.spiLayerOptions.month && obj.type === ihuMap.visibleLayer);
		return identified;
	})[0];
}
ihuMap.getSPIclasses = function ()
{
	if(ihuMap.spiClasses.length > 0)
	{
		var monthData = ihuMap.getSPIforVisibleMonth();
	}
	if(typeof monthData != 'undefined')
	{
		ihuMap.updateSPIoptions();
	}
	//load in the SPI json for that month
	else
	{
		var spiUrl = 'docs/spi_class_'+ihuMap.visibleLayer+'_months/'+wrUtils.getMapLayer(ihuMap.areaFiles,ihuMap.visibleLayer).filePrefix+ihuMap.spiLayerOptions.month+'.json';
		$.ajax({
			url:spiUrl,
			success:function(data){
				//set the spi class index for that month
				if(data.length > 0)
				{
					var monthData = {month:ihuMap.spiLayerOptions.month, values:data, type:ihuMap.visibleLayer};
					ihuMap.spiClasses.push(monthData);
					ihuMap.updateSPIoptions();
				}
			},
			error: function(jqXHR,textStatus,errorThrown){
				alert('Error requesting county data from server due to ['+textStatus+']')
			}
		});
	}
}
//get the value of the spiPeriod button and update the area colour to match.
ihuMap.updateSPIoptions = function()
{
	//when a spiPeriod button is clicked, update the spi color on the map
	if($(this).is('button') && $(this).hasClass('spiPeriod') && !isNaN($(this).val()) && $(this).val() < 8)
	{
		$('.spiPeriod').removeClass('highlighted');
		$(this).addClass('highlighted');
		ihuMap.spiLayerOptions.period = $(this).val();
	}
	//this bit was hard!!! if a layer is geojson and visible, update the polygon color
	ihuMap.map.eachLayer(function (layer) {
        if (layer instanceof L.GeoJSON)
        {
			if(layer.visible)
			{
				layer.eachLayer(function(layer) {
					 ihuMap.updatePolygonStyle(layer.feature,layer);
				});
			}
		}
	});
	return;
}

ihuMap.getSpiStatistics = function(e)
{
	//get all the class json files and loop through them to get the data for a particular polygon
	var featureProperties = e.target.feature.properties;
	$('#spiBlocks').empty();
	var i = 0;
	if((ihuMap.spiLayerOptions.dateIndex - 5) > 0)
	{
		i = ihuMap.spiLayerOptions.dateIndex - 5;
	}
	else
	{
		//i = ihuMap.spiLayerOptions.dateIndex;
		var j = ihuMap.spiLayerOptions.dateIndex;
		while (j > 1)
		{
			j = j-1;
			i = j;
		}
	}
	var counter = 0;
	for(i;i<wrUtils.mapDates.length;i++)
	{
		if(counter < 10)
		{
			var spiCurrentDate = wrUtils.formatDate(i);
			var featureData = {spiDate: spiCurrentDate, haNum: featureProperties.ihuID, name: featureProperties.areaRef};
			if(ihuMap.spiClasses.length > 0)
			{
				var monthData = $.grep(ihuMap.spiClasses,function(obj)
				{
					return obj.month === featureData.spiDate.yearMon;
				})[0];
			}
			if(typeof monthData != 'undefined')
			{
				ihuMap.drawSpiStatistics(featureData);
				counter++;
			}
			//load in the SPI json for that month
			else
			{
				$.ajax({
					url:'docs/spi_class_'+ihuMap.visibleLayer+'_months/'+wrUtils.getMapLayer(ihuMap.areaFiles,ihuMap.visibleLayer).filePrefix+wrUtils.formatDate(i).yearMon+'.json',
					data: {spiDate:spiCurrentDate},
					processData:false,
					success: function(spiClasses)
					{
						if(spiClasses.length > 0)
						{
							var monthData = {month:this.data.spiDate.yearMon, values:spiClasses, type:ihuMap.visibleLayer};
							ihuMap.spiClasses.push(monthData);
							ihuMap.drawSpiStatistics(featureData);
							counter++;
						}
					},
					error: function(jqXHR,textStatus,errorThrown){
						alert('Error requesting county data from server due to ['+textStatus+']')
					}
				});
			}
		}
	};
}
ihuMap.drawSpiStatistics = function(featureData){
	//get the current polygon based on it's feature id (HA_NUM) and then loop through the SPI data to output to the html.
	//get the spi class index for that month
	var monthData = $.grep(ihuMap.spiClasses,function(obj)
	{
		return obj.month === featureData.spiDate.yearMon;
	})[0];
	if(typeof monthData !== 'undefined')
	{
		//get the SPIs for the specific feature for month from monthData variable.
		var spiForFeature = $.grep(monthData.values, function(obj){
			{return obj[wrUtils.getMapLayer(ihuMap.areaFiles,ihuMap.visibleLayer).spiID] == featureData.haNum;}
		})[0];
		if(typeof spiForFeature !== 'undefined')
		{
			var spiHtml = '';
			if($('#spiBlocks').is(':empty'))
			{
				spiHtml += '<h3>SPI monthly data for '+featureData.name+'</h3>';
			}
			spiHtml += '<p>' + featureData.spiDate.fullDate + ': ';
			for(var i = 0; i < spiForFeature.SPI.length; i++)
			{
				var spi = ihuMap.SPIkey[spiForFeature.SPI[i]-1];
				spiHtml += '<span style="background-color:'+spi.color+';" title="'+spi.name+'">'+ihuMap.spiPeriods[i].value+'</span>';
			}
			spiHtml += '</p>';
			$('#spiBlocks').append(spiHtml);
		}
	}
	return;
}

ihuMap.pageLoaded = function()
{
	//change the area type based on zoom level
	ihuMap.map.on('zoomend', function (e) {
		ihuMap.zoomBasedLayerChange();
	});
	return;
}
$(document).ready(ihuMap.init);
$(document).ajaxStop(ihuMap.pageLoaded);