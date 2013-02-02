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
  var circle = L.circle( loc, 500*Math.sqrt(size), circle_options );
  circle.on('click',function(e){
      map.setView(loc,10);
      get_json('/api/crowd/'+crowd_id,{},function(crowd) {
        var view = $($.trim(crowd_template(crowd)));
        crowd_tweets(view.find('.tweets'),crowd);

        var popup = L.popup({minWidth:500,maxWidth:600});
        popup.setLatLng(loc);
        popup.setContent(view[0]);
        popup.openOn(map);
      });
  });
  circle.addTo(map);
  return circle;
}

function crowd_tweets(tweets_div,crowd) {
  var next = '';
  var fetching = true;

  function fetch_tweets() {
    get_json('/api/crowd/'+crowd._id+'/tweets',{next:next},function(data) {
      $.each(data.tweets, function(index, tweet) {
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

function show_clusters(map) {
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

      if (clust.cids.length===1) {
        crowd_marker(map,clust.cids[0],clust.mloc,clust.size);
        return;
      }
      var lat = clust.mloc[0];
      var lng = clust.mloc[1];
      var delta = 0.005*Math.sqrt(clust.size);
      var square = L.rectangle(
        [[lat-delta,lng-1.3*delta],[lat+delta,lng+1.3*delta]],
        square_options
      ).addTo(map);

      square.on('click',function(e) {
        map.setView(clust.mloc,8);
        if (open_cluster) {
          open_cluster.setStyle({opacity:0.5,fillOpacity:0.5});
          $.each(cluster_crowds, function(index, circle) {
              map.removeLayer(circle);
          });
        }
        open_cluster = square;
        cluster_crowds = [];
        square.setStyle({opacity:0.1,fillOpacity:0.02});
        // FIXME: the crowds in clusters get downloaded twice.
        get_json('/api/crowd/bulk',{cids:clust.cids.join()},function(crowds) {
          $.each(crowds.crowds, function(index, crowd) {
            crowd.mloc.reverse();
            var circle = crowd_marker(map,crowd._id,crowd.mloc,crowd.uids.length);
            cluster_crowds.push(circle);
          });
        });
      });
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
