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
  var desc = null;

  var throttle = function(fn, threshold, scope) {
    threshold || (threshold = 250);
    var last,
        deferTimer;
    return function () {
      var context = scope || this;
      var now = + new Date(),
          args = arguments;
      if (last && now < last + threshold) {
        // hold on to it
        window.clearTimeout(deferTimer);
        deferTimer = window.setTimeout(function () {
          last = now;
          fn.apply(context, args);
        }, threshold);
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
      values[id] = (input) ? Math.min(Math.max(parseInt(input.value, 10),0),100) : 0 ;
    }
    return values ;
  };

  var set_user_values = function(data) {
    for (var id in data) {
      var input = document.getElementById("i-"+id) ;
      if (input && input.value) {
        input.value = parseInt(data[id],10) ;
        //input.setAttribute("value", parseInt(data[id],10));
      }
    }
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
      if (scores[i].score === 0) {
        reader.className = "deselected";
      } else if (scores[i].score === 100) {
        reader.className = "selected max";
      } else {
        reader.className = "selected";
      }
      reader.style.opacity = (scores[i].score * 75 / 100 + 25) / 100;
    }
  } ;

  var real_compute_score = function() {
    var values = get_user_values() ;
    var hash = { }
    for (var key in values) {
      if (values[key] > 0) hash[key] = values[key];
    }
    hash = JSON.stringify(hash);
    hash =  hash.substring(1, hash.length - 1).replace(/:/g,"=").replace(/[}{"]/g,'').replace(/,/g,"&");
    if (hash.length > 0) { 
      window.history.replaceState({},window.title,"#"+hash);
    } else {
      window.history.replaceState({},window.title,"/");
    }
    var scores = get_scores(values) ;
    order_results(scores) ;
  };

  var compute_score = throttle(real_compute_score);

  var create_reader = function(reader) {
    var a = document.createElement("a");
    a.href = reader.spec ;
    a.id = "reader-"+reader.id;
    var figure = document.createElement("figure");
    var img = document.createElement("img");
    img.src = reader.image;
    figure.appendChild(img);
    var figcaption = document.createElement("figcaption");
    figcaption.innerHTML = "<span class=name>"+reader.name+"</span> <span class=price>"+reader.price+"</span><span class=score></span>" ;
    figure.appendChild(figcaption);
    a.appendChild(figure);
    results.appendChild(a);
  } ;

  var create_feature = function(id, data) {
    var p = document.createElement("p");
    p.className = "mix " + data.tags.join(" ");
    p.innerHTML = "<label for=\"i-"+id+"\">"+data.label+"</label>" +
                  "<input data-name=\""+id+"\" type=range value=0 id=\"i-"+id+"\" name=\"i-"+id+"\" min=0 max=100>";
    form.appendChild(p);
    if (data.desc) {
      var dt = document.createElement("dt") ;
      dt.appendChild(document.createTextNode(data.label));
      desc.appendChild(dt);
      var dd = document.createElement("dd") ;
      dd.appendChild(document.createTextNode(data.desc));
      desc.appendChild(dd);
    }
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
    if (tags != {} && features.length > 0) {
      window.clearInterval(mixitup);
      create_filters();
      $(form).mixitup({layoutMode: 'list'});
      return true;
    }
    if (max_mixitup-- < 0) {
      window.clearInterval(mixitup);
    }
    return false;
  };

  var load_filters = function() {
    var httpRequest = new XMLHttpRequest();
    httpRequest.onreadystatechange = function () {
      if (httpRequest.readyState === 4 && httpRequest.status === 200) {
        var data = JSON.parse(httpRequest.responseText);
        for(var tag in data) {
          tags[tag] = data[tag] ;
        }
        if (!init_filters()) mixitup = window.setInterval(init_filters, 250) ;
      }
    };
    httpRequest.open('GET', 'lib/tags.json');
    httpRequest.send(null);
  } ;

  var load_features = function(previous_data) {
    var httpRequest = new XMLHttpRequest();
    httpRequest.onreadystatechange = function () {
      if (httpRequest.readyState === 4 && httpRequest.status === 200) {
        var data = JSON.parse(httpRequest.responseText);
        form.innerHTML = "" ;
        for(var feature in data) {
          features.push(feature) ;
          create_feature(feature, data[feature]);
        }
        if (previous_data) {
          set_user_values(previous_data);
          compute_score();
        }
      }
    };
    httpRequest.open('GET', 'lib/features.json');
    httpRequest.send(null);
  } ;
  
  var read_data_from_hash = function(){
	var previous_data = false ;
    if (window.location.hash.match(/^#.*$/)) {
      try {
        var json = unescape(window.location.hash);
        json = json.substring(1).replace(/&/g,",").replace(/\b([0-9a-z_-]+)=(\d+)/g,'"$1":$2');
        if (json[0]!="{") json = "{"+json+"}"
        previous_data = JSON.parse(json);
      } catch(e) {
        // nothing
      }
    }
    return previous_data;
  }

  var attach_event = function () {
    form.addEventListener('change', compute_score, false);
    form.addEventListener('input', compute_score, false);
    form.addEventListener('reset', function() { window.setTimeout(compute_score, 50); }, false);
  } ;

  module.load = function (id) {
    var httpRequest = new XMLHttpRequest();
    httpRequest.onreadystatechange = function () {
      if (httpRequest.readyState === 4 && httpRequest.status === 200) {
        var data ;
        try {
          data = JSON.parse(httpRequest.responseText);
        } catch(e) {
          // console.log("error in "+id);
        }
        readers[data.id] = data ;
        create_reader(data) ;
        compute_score() ;
      }
    };
    httpRequest.open('GET', 'lib/readers/'+id+'.json');
    httpRequest.send(null);
  } ;

  module.init = function(_form, _filters, _results, _desc) {
    form = _form;
    filters = _filters;
    results = _results;
    desc = _desc;
    var previous_data = read_data_from_hash();
    load_features(previous_data);
    load_filters();
    attach_event();
    if ("onhashchange" in window) {
		window.onhashchange = function(){
			var previous_data = read_data_from_hash();
			if(previous_data) {
			  set_user_values(previous_data);
			  compute_score();
			}
		};
    }
  } ;

  return module ;

}(window, document));
