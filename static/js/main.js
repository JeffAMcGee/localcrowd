var crowd_template = _.template($('#crowd_template').html());
var tweet_template = _.template($('#tweet_template').html());


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


function crowd_marker(map,crowd_id,loc,size) {
  var circle_options = {
      stroke: true,
      color: 'red',
      fillColor: 'red',
      opacity: 0.5,
      fillOpacity: 0.5
  };
  // make the circles have an even width, and an integer radius
  var px = 2*Math.round(2+0.5*Math.sqrt(size));
  var icon = L.divIcon({iconSize:[px,px]});
  var circle = L.marker( loc,{icon:icon} /*, 500*Math.sqrt(size), circle_options*/ );
  circle.on('click',function(e){
      //map.setView(loc,Math.max(10,map.getZoom()));
      get_json('/api/crowd/'+crowd_id,{},function(crowd) {
        var view = $($.trim(crowd_template(crowd)));
        crowd_tweets(view.find('.tweets'),crowd);

        var popup = L.popup({minWidth:500,maxWidth:600});
        popup.setLatLng(loc);
        popup.setContent(view[0]);
        popup.openOn(map);
      });
  });
  return circle;
}


function crowd_tweets(tweets_div,crowd) {
  var next = '';
  var fetching = true;

  function fetch_tweets() {
    get_json('/api/crowd/'+crowd._id+'/tweets',{next:next},function(data) {
      $.each(data.tweets, function(index, tweet) {
        tweet.html = twttr.txt.autoLink(tweet.tx,{urlEntities:tweet.ents.urls || []});
        tweets_div.append(tweet_template(tweet));
      });
      next = data.next;
      fetching = false;
    });
  }

  fetch_tweets();

  tweets_div.scroll(function(event) {
      var bottom = this.scrollHeight-$(this).scrollTop()-$(this).height();
      if( bottom<=30 && !fetching && next) {
        fetching = true;
        fetch_tweets();
      }
  });
}


function load_crowds(map,params,callback) {
  get_json('/api/crowd/bulk',params,function(data) {
    var group = L.layerGroup();
    $.each(data.crowds, function(index, crowd) {
      circle = crowd_marker(map,crowd[0],[crowd[3],crowd[2]],crowd[1]);
      group.addLayer(circle);
    });
    callback(group);
  });
}


$(function() {
  var map = L.map('map',{maxZoom:13,minZoom:2}).setView([38, -98], 5);

  L.tileLayer( 'http://{s}.tile.cloudmade.com/3c84c4f923824f7cb6836564e90876f3/84377/256/{z}/{x}/{y}.png', {
      attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a>, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery &copy; <a href="http://cloudmade.com">CloudMade</a>',
      maxZoom: 18
  }).addTo(map);

  load_crowds(map, {zoom:0}, function(group) {
    group.addTo(map);
  });

  var old_crowds = null;
  function map_moved(e) {
    var zoom = map.getZoom()-6;
    if(zoom<1) return;
    var bounds = map.getBounds().toBBoxString();
    load_crowds(map, {zoom:zoom,bounds:bounds,onlysmall:1}, function(group) {
      if(old_crowds)
        map.removeLayer(old_crowds);
      map.addLayer(group);
      old_crowds = group;
    });
  }

  map.on('zoomend', map_moved);
  map.on('moveend', map_moved);
});
