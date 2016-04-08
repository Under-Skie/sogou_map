(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD
    define('SogouMap', ['jquery'], function (jQuery, _) {
      return factory(jQuery);
    });
  } else if (typeof exports === 'object') {
  // Node.js
    module.exports = factory(require('jquery'));
  } else {
    // Browser globals
    root.SogouMap = factory(root.jQuery);
  }
}(window, function (jQuery) {
  var map_json_url =   typeof window.SogouMap!=='undefined' && window.SogouMap.hasOwnProperty('map_json_url') ? window.SogouMap.map_json_url :'';
  var SogouMap = typeof window.SogouMap!=='undefined' ? window.SogouMap : null;
  /*var arr =  {};
  $.each(ls['city'],function(i,v){
    arr[v.name] = v;
  });
  $.each(ls['province'],function(i,v){
       arr[v.name] = v;
       $.each(v['citys'],function(i,v){
          arr[v.name] = v;
      });
  });
 
  console.log(JSON.stringify(arr));

  var s = arr.join(",");
  console.log(s);*/
   function Store(){
     this._data = {}
   }
   Store.prototype.setItem = function(k,v){
     this._data[k] = v;
   }
   Store.prototype.getItem = function(k){
     if (k in this._data){
       return this._data[k];
     }else{
       return undefined;
     }
     
   }
  var supportLocalStorage =  "localStorage" in window,store = supportLocalStorage ? window.localStorage : new Store();

  var storeOpen = $.Deferred(),promiseStoreOpened =  function(async){
    var _async = typeof async === "undefined" && async !==true ? true : false; 
    if(!store.getItem('mapsmap')){
        $.ajax({
          url:map_json_url,
          async:_async
        }).done(function(data,statusText,xhr){
          store.setItem('mapsmap',JSON.stringify(data));
          storeOpen.resolve(data);
        }).fail(function(){
          storeOpen.reject();
        });
     }else{
       var data = JSON.parse(store.getItem('mapsmap'));
        storeOpen.resolve(data);
    }
    return storeOpen.promise();
  }
    

 var SogouMap = function(selector,options){
      this._options = options || {};
      this.element = $(selector).get(0);
      this._map = new sogou.maps.Map(self.element, this._options);
  };
  
  SogouMap.prototype.init = function (options,extroOptions){
    var deferred = $.Deferred();
    var defaultOptions = {
        zoom: 10,
        mapControl:false,
        // hdSogouMap:true,
        //tileSize: new sogou.maps.Size(256,256),  //普清的瓦片大小为new Size(256,256)，
        //高清的瓦片大小默认为new Size(192,192)，
        //在new ipad和iphone 4s上建议设置为new Size(128,128)。
        mapTypeId:sogou.maps.MapTypeId.EDUSHIMAP,
    };
    $.extend(this._options,defaultOptions,options,extroOptions);
    var self = this
    
    // var _extroOptions = $.extend({},extroOptions);
    ,center = this._options['center']
    ,createSogouMap = function(a){
        console.log('create map',a,self._options)
        if(typeof a !=='undefined' ){
            if(a.status=='ok'){
              console.log('map api ok')
              var geometry=a.data[0];
              self._options.center = new sogou.maps.Point(geometry.location.x,geometry.location.y)
            }else{
              console.log('map api error');
              deferred.reject();
            }
          }
        self._map = new sogou.maps.Map(self.element, self._options);
        deferred.resolve();
    };
    if(typeof this._options['address']!=='undefined'){
      if(typeof this._options.address.addr!=='undefined')
      self._options.center = self._options.address.addr;
    }
    if(typeof center === 'string' ){
      this.indexed(center).done(function(){
        var location =  SogouMap.prototype.allIndexedLocation[center];
        self._options.center = new sogou.maps.Point(parseInt(location.x),parseInt(location.y));
        // _options.center = new sogou.maps.Point(12956000,4824875);
        console.log('center indexed');
        createSogouMap();
      }).fail(function(){
        console.log('center not indexed',self._options);
          var request = typeof self._options['address']!=='undefined' ? 
          {address:self._options.address}  : {address:{addr:self._options.center}}
          ;
           if(typeof request.address.addr==='undefined'){
             request.address.addr = self._options.center;
           }
          var geo = new sogou.maps.Geocoder();
          geo.geocode(request,createSogouMap);
      });
     
    }else if($.isArray(center)){
      self._options['center'] = new sogou.maps.Point(center[0],center[1]); 
      createSogouMap();
    }else{
      //latlong ,Point
      createSogouMap();
    }
   
    return deferred.promise()
  };
  SogouMap.prototype.indexed = function(s){
    var deferred = $.Deferred();
    var storeOpended = typeof  SogouMap.prototype.allIndexedLocation !== "undefined";
    if( storeOpended){
      console.log('storeopened')
      if(s in SogouMap.prototype.allIndexedLocation){
        deferred.resolve();
      }else{
        deferred.reject();
      }
    }else{
        $.when(promiseStoreOpened(false)).done(function(data){
          SogouMap.prototype.allIndexedLocation = data;
          if(s in SogouMap.prototype.allIndexedLocation){
            deferred.resolve();
          }else{
            deferred.reject();
          }
    });
  }
  
  return deferred.promise()
  };
  SogouMap.prototype.setCenter=function(){
    var args = Array.prototype.slice.call(arguments);
    if(!args[0]) return;
    var zoom = this._map.getZoom();
    console.log('zoom:',zoom);
    var offsetX = this._options.centerOffset.x* SogouMap.prototype.zoomLevels[zoom]/2;
    var offsetY = this._options.centerOffset.y* SogouMap.prototype.zoomLevels[zoom]/2;
    var x = args[0].x,y=args[0].y;
    if(!isNaN(offsetX)){
      x = x+offsetX
    }
    if(!isNaN(offsetY)){
      y-= offsetY;
    }
    var point =new sogou.maps.Point(x,y);
    console.log('map center:',offsetX,offsetY,zoom);
    // var arr = [point];
    sogou.maps.Map.prototype.setCenter.call(this._map,point)
  };
  SogouMap.prototype.addListener = function(eve,func){
    sogou.maps.event.addListener(this._map,eve,func);
  }
  SogouMap.prototype.removeListener = function(listener){
    sogou.maps.event.removeListener(listener);
  }
  SogouMap.prototype.imageBaseUrl = './images/';
  SogouMap.prototype.defaultIcon = SogouMap.prototype.imageBaseUrl +"maker_white.png";
  SogouMap.prototype.addMarker = function(markerOptions,cb){
    if(typeof markerOptions['map']==='undefined')
    markerOptions.map = this._map;
    if(markerOptions.title===null){
      markerOptions.title='';
     
    }
     if(markerOptions.position[0]===null ||markerOptions.position[1]===null ){
        return;
      }
    var icon = SogouMap.prototype.defaultIcon;
    if(typeof markerOptions['icon']==='undefined'){
      if(typeof markerOptions['status']==='string'){
        switch (markerOptions['status']){
          case 'warning':
          icon =  SogouMap.prototype.imageBaseUrl+'point_yellow.png';
          break;
          case 'important':
          icon = SogouMap.prototype.imageBaseUrl+'point_orange.png';
          break;
          case 'emergency':
          icon = SogouMap.prototype.imageBaseUrl+'point_red.png';
          break;
        }
      }
    }else{
      icon = markerOptions['icon'];
    }
    markerOptions.icon = icon;
    var marker = new sogou.maps.Marker(markerOptions);
    if (typeof cb === 'function'){
      sogou.maps.event.addListener(marker,"click",cb);
    }
    console.log('addMarker marker id:',marker.id)
    return marker;
  };
  SogouMap.prototype.addBrand = function(point,content){
     var branddong = new sogou.maps.Brand({
        position:point,
        map: this._map,
        spirit:
        {
            url:SogouMap.prototype.imageBaseUrl+"icon_brand.png",
             imgSize:[80,48],
              clips:[[0,0,1,48],[1,0,1,48],[79,0,1,48],[0,48,14,10]],
             anchor:[0,0],
             footOffset:[-5,-11]
        }
        ,content:content
        //是否可见，可缺省，缺省为true
        ,visible:true
        //指定内容区固定宽度为80，如果不指定，则会根据内容大小自动适应
        // ,fixSize:new sogou.maps.Size(80,0)
        //指定css，css要在样式表事先定义好
        ,css:"brand_one"
    });
  };
  SogouMap.prototype.drawPath = function(points){
    console.log(points)
    var img=SogouMap.prototype.imageBaseUrl+'icon_mark_guiji.png';
    var mark_guiji2=SogouMap.prototype.imageBaseUrl+'icon_mark_guiji2.png';
    var flightPlanCoordinates=[];
    var last = points.length-1;
    for(var i=0;i<points.length;i++){
      if(i===last){
        img=mark_guiji2;
      }
      console.log("drawPath")
      var position =points[i].position;
      console.log(points[i])
      var point =new sogou.maps.Point(position[0],position[1]);
      flightPlanCoordinates.push(point);
      var marker = this.addMarker({
            position: point,
            title:points[i].title,
            icon:img,
            id:points[i].id,
            label:{visible:true}
        });

    }
    var flightPath = new sogou.maps.Polyline({
      path: flightPlanCoordinates,
      strokeColor: "#f29a14",
      strokeOpacity: 1.0,
      strokeWeight: 3
    });
    flightPath.setMap(this._map);
  };
  SogouMap.prototype.geocode = function(request){
    var deferred = $.Deferred()
    , callback = function(a){
      if(a.status=='ok'){
        console.log('map api ok',a.data)
        var geometry=a.data;
        deferred.resolveWith(geometry);
      }else{
        console.log('map api error');
        deferred.reject();
      }
    }
     , geo=new sogou.maps.Geocoder();
    geo.geocode(request,callback);
    return deferred.promise();
  }
  SogouMap.prototype.initialPoints =function(points){
    this.initialPointsArray = points;
    this.fillPoints(points);
  }
  SogouMap.prototype.reset = function(){
    this.clearAll();
    this.setCenter( this._options.center);
    this.setZoom(this._options.zoom);
    this.fillPoints(this.initialPointsArray);
    this.fillBrands(this.initialBrandsArray);
  }
  SogouMap.prototype.markerListener = function(){};
  SogouMap.prototype.getMarkerListener = function(){
    return SogouMap.prototype.markerListener;
  };
  SogouMap.prototype.pointsData = {};
  SogouMap.prototype.restoreLastPoints=function(exceptPoint){
    for(var i=0;i<this.lastPoints.length;i++){
      var point  = this.lastPoints[i];
      if(point.x == exceptPoint && point.y ==exceptPoint.y ){
        delete this.lastPoints[i];
      }
    }
    this.fillPoints(this.lastPoints);
  };
  SogouMap.prototype.fillPoints = function (points){
    this.lastPoints = points;
      for(var i=0;i<points.length;i++){
        var position =  new sogou.maps.Point(points[i].position[0],points[i].position[1]);
        var markerOptions ={
            position: position,
            title:points[i].title,
            // icon:markimg,
            // map:this._map,
            id:points[i].id,//@TODO 节点ID
            // id:'id'+Math.random(),
            label:{visible:true}
        } ;
        if(typeof points[i].status ==='string')
        markerOptions.status = points[i].status;
         var marker3 = this.addMarker(markerOptions);
        var self = this;
        var listener = self.getMarkerListener();
          var isSearch =  typeof points[i].isSearch !=='undefined' &&points[i].isSearch===true? true:false;
        sogou.maps.event.addListener(marker3,"click",function(){
          
          listener.call(this,isSearch,true);
        });
        // marker3.setSogouMap(this._map);
      }
    }

   SogouMap.prototype.initialBrands = function(brands){
     this.initialBrandsArray = brands;
     this.fillBrands(brands);
   }
   SogouMap.prototype.fillBrands=function (brands){
        if(!brands.length) return;
       for(var i=0;i<brands.length;i++){
         var position =  new sogou.maps.Point(brands[i].position[0],brands[i].position[1]);
         this.addBrand(position,brands[i].title);
       }
     }
  $.each(sogou.maps.Map.prototype,function(k,v){
    if(!SogouMap.prototype[k] && typeof v =='function'){
      SogouMap.prototype[k] = function(){
        return v.apply(this._map,Array.prototype.slice(arguments));
      }
    }
  });
  SogouMap.prototype.zoomLevels ={
    1:78271.5170,
    2:39135.7585,
    3:19567.8792,
    4:9783.9396,
    5:4891.9698,
    6:2445.9849,
    7:1222.9925,
    8:611.4962,
    9:305.7481,
    10:152.8741,
    11:76.4370,
    12:38.2185,
    13:19.1093,
    14:9.5546,
    15:4.7773,
    16:2.3887,
    17:1.1943,
    18:0.5972,
    19:0.2986,
    20:0.1493,
    21:0.0746,
    22:0.0373,
    23:0.0187
  };
  return SogouMap;
 
}));