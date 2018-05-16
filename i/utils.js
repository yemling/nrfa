var wrUtils = {};
wrUtils.init = function()
{
	wrUtils.dates = wrUtils.getSpiDates();
	wrUtils.mapDates = wrUtils.dates.split(',');
	ihuMap.spiLayerOptions.month = wrUtils.formatDate(0).yearMon;
	return;
}
wrUtils.getSpiDates = function()
{
	var startYear = 2005;
	var endYear = 2012;
	var dates = '';
	var counter = 0;
	var lastComma = ((endYear - startYear+1) * 12) - 1;
	for (var i = startYear; i <= endYear; i++)
	{
		for (var m = 1; m <= 12; m++)
		{
			if (m < 10)
			{
				m = '0'+m;
			}
			dates+= i + '-' + m + '-01T00:00:00.000Z';
			if(counter != lastComma)	
			{
				dates += ',';
			}
			counter = counter + 1;
		}
	}
	return dates;
}

wrUtils.getParameterByName = function(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

wrUtils.randomColor = function()
{
	return '#'+(Math.random()*0xFFFFFF<<0).toString(16);
}

wrUtils.formatDate = function(index)
{
	var dateStruct = {};
	//only showing the date not the whole timestamp.
	dateStruct.fullDate = wrUtils.mapDates[index].substring(0,wrUtils.mapDates[index].indexOf('T'));
	dateStruct.dateArr = dateStruct.fullDate.split('-');
	//For json files, only want a concatenation of year and month
	dateStruct.yearMon = dateStruct.dateArr[0]+dateStruct.dateArr[1];
	dateStruct.shortDate = dateStruct.dateArr[0]+'-'+dateStruct.dateArr[1];
	return dateStruct;
	
}
wrUtils.getMapLayer = function(arr,layerName)
{
	return $.grep(arr, function(obj){return obj.name === layerName;})[0];
}
$(document).ready(wrUtils.init);