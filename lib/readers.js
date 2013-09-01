var READERS = (function (window, document) {

  var form = null;
  var filters = null;
  var results = null ;
  var module = { } ;
  var readers = { } ;
  var features = [ ] ;
  var tags = { } ;
  var mixitup =null;
  var max_mixitup = 30;

  var throttle = function(fn, threshhold, scope) {
    threshhold || (threshhold = 250);
    var last,
        deferTimer;
    return function () {
      var context = scope || this;
      var now = + new Date(),
          args = arguments;
      if (last && now < last + threshhold) {
        // hold on to it
        window.clearTimeout(deferTimer);
        deferTimer = window.setTimeout(function () {
          last = now;
          fn.apply(context, args);
        }, threshhold);
      } else {
        last = now;
        fn.apply(context, args);
      }
    };
  } ;

  var get_user_values = function() {
    var values = { } ;
    for (var index in features) {
      var id = features[index];
      var input = document.getElementById("i-"+id) ;
      values[id] = (input) ? parseInt(input.value, 10) : 0 ;
    }
    return values ;
  };

  var get_scores = function(coef) {
    var max = 0 ;
    var constant_order = 1 ;
    var scores = [ ] ;
    var compare = function(a, b) {return a.score - b.score;} ;
    for (var reader in readers) {
      var result = 0 - (constant_order++)/100000 ;
      for (var feature in coef) {
        result += coef[feature] * readers[reader]["features"][feature] ;
      }
      max = Math.max(result, max) ;
      scores.push({reader:reader, score:result});
    }
    scores.sort(compare);
    for (var i in scores) { scores[i].score = Math.round(scores[i].score / Math.max(max, 1)*100); }
    return scores;
  } ;
  
  var order_results = function(scores) {
    var last = null;
    for (var i=scores.length -1; i>=0; i--) {
      var reader = document.getElementById("reader-"+scores[i].reader) ;
      reader.getElementsByClassName("score")[0].innerHTML = "(score: "+scores[i].score+")";
      if (last) {
        results.insertBefore(reader, last);
      } else {
        results.appendChild(reader);
      }
    }
  } ;

  var real_compute_score = function() {
    var values = get_user_values() ;
    var scores = get_scores(values) ;
    order_results(scores) ;
  };

  var compute_score = throttle(real_compute_score);

  var create_reader = function(reader) {
    var a = document.createElement("a");
    a.href = reader.spec ;
    a.id = "reader-"+reader.id;
    var figure = document.createElement("figure");
    a.appendChild(figure);
    var figcaption = document.createElement("figcaption");
    figcaption.innerHTML = "<span class=name>"+reader.name+"</span> <span class=price>"+reader.price+"</span><span class=score></span>" ;
    figure.appendChild(figcaption);
    var img = document.createElement("img");
    img.src = reader.image;
    figure.appendChild(img);
    results.appendChild(a);
  } ;

  var create_feature = function(id, data) {
    var p = document.createElement("p");
    p.className = "mix " + data.tags.join(" ");
    p.innerHTML = "<label for=\"i-"+id+"\">"+data.label+"</label>" +
                  "<input data-name=\""+id+"\" type=range value=0 id=\"i-"+id+"\" name=\"i-"+id+"\" min=0 max=100>";
    form.appendChild(p);
  } ;

  var create_filters = function() {
    for(var tag in tags) {
      var item = document.createElement("li");
      item.className = "filter";
      item.dataset.filter = tag;
      item.innerHTML = tags[tag];
      filters.appendChild(item);
    }
  } ;

  var init_filters = function() {
    console.log("try init filters");
    if (tags != {} && features.length > 0) {
      window.clearInterval(mixitup);
      create_filters();
      $(form).mixitup();
      console.log("init filters");
      return true;
    }
    if (max_mixitup-- < 0) {
      window.clearInterval(mixitup);
      console.debug("TAGS", tags);
      console.debug("FEATURES", features);
    }
    return false;
  };

  var load_filters = function() {
    var httpRequest = new XMLHttpRequest();
    httpRequest.onreadystatechange = function () {
      if (httpRequest.readyState === 4 && httpRequest.status === 200) {
        var data = JSON.parse(httpRequest.responseText);
        console.debug("JSON FILTERS", data);
        for(var tag in data) {
          console.log("tag "+tag+" = "+data[tag]);
          tags[tag] = data[tag] ;
        }
        console.log("load filters");
        if (!init_filters()) mixitup = window.setInterval(init_filters, 250) ;
      }
    };
    httpRequest.open('GET', 'lib/tags.json');
    httpRequest.send(null);
  } ;

  var load_features = function() {
    var httpRequest = new XMLHttpRequest();
    httpRequest.onreadystatechange = function () {
      if (httpRequest.readyState === 4 && httpRequest.status === 200) {
        var data = JSON.parse(httpRequest.responseText);
        form.innerHTML = "" ;
        for(var feature in data) {
          features.push(feature) ;
          create_feature(feature, data[feature]);
          console.log("load features");
        }
      }
    };
    httpRequest.open('GET', 'lib/features.json');
    httpRequest.send(null);
  } ;
  

  var attach_event = function () {
    form.addEventListener('change', compute_score, false);
  } ;

  module.load = function (id) {
    var httpRequest = new XMLHttpRequest();
    httpRequest.onreadystatechange = function () {
      if (httpRequest.readyState === 4 && httpRequest.status === 200) {
        var data = JSON.parse(httpRequest.responseText);
        readers[data.id] = data ;
        create_reader(data) ;
        compute_score() ;
      }
    };
    httpRequest.open('GET', 'lib/readers/'+id+'.json');
    httpRequest.send(null);
  } ;

  module.init = function(_form, _filters, _results) {
    form = _form;
    filters = _filters;
    results = _results;
    load_features();
    load_filters();
    attach_event();
  } ;

  return module ;

}(window, document));
