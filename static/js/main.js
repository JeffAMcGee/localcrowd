
function get_json(url,data,success) {
  $.ajax(url,{
      data:data,
      timeout:15000,
      success: success,
      error: function(jqXHR,textStatus,errorThrown) {
        var error;
        if(textStatus=='error') {
          if(jqXHR.status===0)
            error = "Could not connect to server. Try running ./serve.py.";
          else
            error = jqXHR.status+" : "+errorThrown;
        } else {
          error = textStatus;
        }
        console.log(error);
      },
      dataType: 'json'
  });
}


function show_clusters(map) {
  var circle_options = {
      stroke: true,
      color: 'red',
      fillColor: 'red',
      opacity: 0.5,
      fillOpacity: 0.5
  };
  var square_options = {
        stroke: true,
        color: 'blue',
        fillColor: 'blue',
        opacity: 0.5,
        fillOpacity: 0.5
  };

  get_json('/api/clusters',{},function(data) {
    var open_cluster = null;
    var cluster_crowds = [];
    $.each(data.cls, function(index, clust) {
      clust.mloc.reverse();

      var single = (clust.cids.length===1);
      if (single) {
        var circle = L.circle(
          clust.mloc,
          500*Math.sqrt(clust.size),
          circle_options
          ).addTo(map);
        circle.on('click',function(e){
            if(open_cluster) {
              //FIXME: magic
            }
            open_cluster = null;
            map.setView(clust.mloc,10);
            get_json('/api/crowd/'+clust.cids[0],{},function(crowd) {
              var popup = L.popup().setLatLng(clust.mloc);
              popup.setContent("hi");
              popup.openOn(map);
              console.log(crowd);
            });
        });

      } else {
        var lat = clust.mloc[0];
        var lng = clust.mloc[1];
        var delta = 0.005*Math.sqrt(clust.size);
        var square = L.rectangle(
          [[lat-delta,lng-delta],[lat+delta,lng+delta]],
          square_options
          ).addTo(map);
        square.on('click',function(e){
          open_cluster = clust;
          get_json('/api/crowd/bulk',{cids:clust.cids.join()},function(crowds) {
              console.log(crowds);
          });

        });


      }
    });
  });
}

$(function() {
  var map = L.map('map',{maxZoom:13,minZoom:2}).setView([38, -98], 5);

  L.tileLayer( 'http://{s}.tile.cloudmade.com/3c84c4f923824f7cb6836564e90876f3/84377/256/{z}/{x}/{y}.png', {
      attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a>, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery &copy; <a href="http://cloudmade.com">CloudMade</a>',
      maxZoom: 18
  }).addTo(map);

  show_clusters(map);
});
