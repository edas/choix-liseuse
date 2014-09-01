var READERS = (function (window, document) {

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

  var create_reader = function(base, reader) {
    var a = document.createElement("a");
    a.href = reader.url ;
    a.id = "reader-"+reader.id;
    var figure = document.createElement("figure");
    var img = document.createElement("img");
    img.src = reader.img;
    figure.appendChild(img);
    var figcaption = document.createElement("figcaption");
    figcaption.innerHTML = "<span class=name>"+reader.name+"</span> <span class=price>"+reader.buy+"&nbsp;&euro;</span><span class=score></span>" ;
    figure.appendChild(figcaption);
    a.appendChild(figure);
    base.appendChild(a);
  } ;

  var create_feature = function(base, data) {
    var id = data[0];
    var desc = data[1];
    var p = document.createElement("p");
    var span = document.createElement("span");
    var choices = [
      [  0, 'inutile'],
      [ 20,  'accessoire'],
      [ 45,  'utile'],
      [100, 'important'],
    ];
    for (var i=0;i<choices.length;i++) {
      var input = document.createElement("input");
      var cid = "" + choices[i][0];
      var cdesc = choices[i][1];
      input.id = id+"-"+cid;
      input.name = id;
      input.type = "radio";
      input.value = "" + cid;
      input.checked = (i == 0);
      input.defaultChecked = (i == 0);
      input.onchange = form_change;
      var label = document.createElement("label");
      label.htmlFor = id+"-"+cid;
      var msg = document.createTextNode(cdesc);
      label.appendChild(msg);
      span.appendChild(input);
      span.appendChild(label);
    }
    input = document.createElement("input");
    input.id = id+'-arbitrary';
    input.name = id;
    input.type = "radio";
    input.value = "1";
    input.checked = false;
    input.defaultChecked = false;
    input.className = 'arbitrary';
    input.style.display='none';
    span.appendChild(input);
    p.appendChild(span);
    span = document.createElement("span");
    msg = document.createTextNode(desc);
    span.appendChild(msg);
    p.appendChild(span);
    base.appendChild(p);
  };

  var readers_base = null;
  var features_base = null; 
  var readers_data = [ ];

  var get_form_values = function () {
    var base = document.getElementById(features_base);
    var data = { };
    Array.prototype.forEach.call(base.getElementsByTagName("input"), function (e) {
      if (e.checked == true) {
        data[e.name] = e.value;
      }
    });
    return data;
  }
  var write_hash_data = function (data) {
    hash = [];
    for (var i in data) {
      hash.push(i+"=" + data[i]);
    }
    hash = hash.join('&');
    if (hash.length > 0) { 
      window.history.replaceState({},window.title,"#b&"+hash);
    } else {
      window.history.replaceState({},window.title,"/");
    }
  } ;

  var display_score = function() {
    var last = null;
    var results = document.getElementById(readers_base);
    for (var i=readers_data.length -1; i>=0; i--) {
      var reader = document.getElementById("reader-"+readers_data[i].id) ;
      reader.getElementsByClassName("score")[0].innerHTML = "(score: "+readers_data[i].score+")";
      results.appendChild(reader);
      if (readers_data[i].score === 0) {
        reader.className = "deselected";
      } else if (readers_data[i].score === 100) {
        reader.className = "selected max";
      } else {
        reader.className = "selected";
      }
      reader.style.opacity = (readers_data[i].score * 75 / 100 + 25) / 100;
    }
  };


  var compute_score = function(data) {
    for (var i in readers_data) { 
      var reader = readers_data[i];
      reader.score = 0;
      for (var j in data) {
        reader.score = reader.score + (parseInt(reader['feature-'+j]) || 0) * (parseInt(data[j]) || 0);
      }
    }
    var compare = function(a, b) {return a.score - b.score;} ;
    readers_data.sort(compare);
    display_score();
  };

  var load_hash_data = function () {
    var base = document.getElementById(features_base);
    if (window.location.hash.match(/^#b&.*$/)) {
      try {
        var json = unescape(window.location.hash);
        json = json.substring(3).replace(/&/g,",").replace(/\b([0-9a-z_-]+)=(\d+)/g,'"$1":$2');
        if (json[0]!="{") json = "{"+json+"}"
        data = JSON.parse(json);
        for (var i in data) {
          var checked = false;
          Array.prototype.forEach.call(base[i], function(e) {
            checked = checked || ( e.checked = (e.value == "" + data[i]) );
            if (!checked && (e.className == "arbitrary")) {
              e.value = "" + data[i];
              e.checked = true;
            }
          });
        }
      } catch(e) {
        // nothing
      }
    }
  };

  var hash_change = function () {
    load_hash_data();
    var data = get_form_values() ;
    compute_score(data);
  } ;

  var recompute_score = function () {
    var data = get_form_values() ;
    compute_score(data);
  };

  var form_change = function () {
    var data = get_form_values() ;
    write_hash_data(data);
    compute_score(data);
  };

  var load_features = function(base) {
    var httpRequest = new XMLHttpRequest();
    httpRequest.onreadystatechange = function () {
      if (httpRequest.readyState === 4 && httpRequest.status === 200) {
        var content = httpRequest.responseText;
        var data = JSON.parse(content);
        base.innerHTML = "" ;
        for(var feature in data) {
          create_feature(base, data[feature]);
        }
        hash_change();
      }
    };
    httpRequest.open('GET', 'lib/features.json');
    httpRequest.send(null);
  };

  var load_readers = function(base) {
    var httpRequest = new XMLHttpRequest();
    httpRequest.onreadystatechange = function () {
      if (httpRequest.readyState === 4 && httpRequest.status === 200) {
        var data = JSON.parse(httpRequest.responseText);
        readers_data = data; 
        base.innerHTML = "" ;
        for(var reader in data) {
          create_reader(base, data[reader]);
        }
        recompute_score();
      }
    };
    httpRequest.open('GET', 'lib/readers.json');
    httpRequest.send(null);
  };

  var init = function(readers, features) {
    readers_base = readers;
    features_base = features;
    load_features(document.getElementById(features));
    load_readers(document.getElementById(readers));
    window.addEventListener("hashchange", hash_change, false);
  };

  return init;

}(window, document));
