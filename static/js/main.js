/*
var po = org.polymaps;

var map = po.map()
    .container(document.getElementById("map").appendChild(po.svg("svg")))
    .zoomRange([4, 9])
    .zoom(7)
    .add(po.image().url("http://s3.amazonaws.com/com.modestmaps.bluemarble/{Z}-r{Y}-c{X}.jpg"))
    .add(po.interact())
    .add(po.compass().pan("none"));
*/
var map = L.map('map',{maxZoom:13,minZoom:2}).setView([38, -98], 5);

L.tileLayer('http://{s}.tile.cloudmade.com/3c84c4f923824f7cb6836564e90876f3/84377/256/{z}/{x}/{y}.png', {
    attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a>, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery &copy; <a href="http://cloudmade.com">CloudMade</a>',
    maxZoom: 18
}).addTo(map);

//FIXME: magic global clusts come from clusts.js, should come from AJAX
$.each(clusts, function(index, clust) {
  var circle = L.circle(clust.loc.reverse(), 500*Math.sqrt(clust.size), {
      color: 'red',
      fillColor: '#f03',
      fillOpacity: 0.5
  }).addTo(map);
});
