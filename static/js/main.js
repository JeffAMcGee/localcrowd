
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

function noise() {
  return 0.02*(Math.random()-0.5);
}

function show_vines(map,last) {
  get_json('/api/tweets',{last:last},function(data) {
    console.log(data.tweets.length);
    $.each(data.tweets, function(index, tweet) {
      var lng = tweet.user_d.ploc[0];
      var lat = tweet.user_d.ploc[1];
      var icon = L.icon({
          iconUrl: tweet.user_d.img,
          iconAnchor: [24,24],
          iconSize: [48, 48]
      });
      var marker = L.marker(
        [lat+noise(),lng+noise()],
        {icon: icon}
      ).addTo(map);
      text = '<iframe height="380" src="'+tweet.vine+'/card" frameborder="0" width="380"></iframe>';
      marker.bindPopup(text,{maxWidth:500});
    });
    setTimeout(
      function(){show_vines(map,data.last);},
      15000);
  });
}

$(function() {
  var map = L.map('map',{maxZoom:13,minZoom:2}).setView([30, -30], 3);

  L.tileLayer( 'http://{s}.tile.cloudmade.com/3c84c4f923824f7cb6836564e90876f3/84377/256/{z}/{x}/{y}.png', {
      attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a>, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery &copy; <a href="http://cloudmade.com">CloudMade</a>',
      maxZoom: 14
  }).addTo(map);

  show_vines(map,'');
});
