// Copyright (c) 2009, Braydon Fuller

// This program is free software; you can redistribute it and/or
// modify it under the terms of the GNU General Public License
// as published by the Free Software Foundation; either version 2
// of the License, or (at your option) any later version.

// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with this program; if not, write to the Free Software
// Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  
// 02110-1301, USA.

function Video(params){
    this.nativeVideo = false
    this.element = false
    this.video = false
    this.controller = false

    function bool(b) { if (b) return 1; return 0;}
    function hq(s) { return '"' + hx( s ) + '"';}
    function hx(s){
    if ( typeof s != 'String' ) { s = s.toString() }
    return s.replace( /&/g, '&amp;' )
      . replace( /</g, '&lt;' )
      . replace( />/g, '&gt;' );
	}

    function hasattr(elem,attr) {
	var isset;
	try {
	    eval("isset=typeof elem."+attr+"!='undefined';");
	} catch (e) {
	    isset=false;
	}
	return isset;
    }

    function dir(ob){
	var a=[],attr
	for(attr in ob){a.push(attr)}
	return a.sort().join(' ')
    }


    // Detect <video> element, and supported API
    this.detect = function() {
	// 'object' for Firefox & Safari, and 'function' for Opera
	if ( typeof HTMLVideoElement == 'object' || 
	     typeof HTMLVideoElement == 'function'){
	    hve = document.createElement('video');
	    // check to see if we have the needed API, at some
	    // point this should support a wider range
	    if(hasattr(hve, 'currentTime') && hasattr(hve, 'play') && 
	       hasattr(hve, 'pause') && hasattr(hve, 'duration') && 
	       hasattr(hve, 'volume')) {
		this.nativeVideo = true;
	    }

	}
    }

    // Insert <video> element
    this.embedVideoElement = function(elm, params) {
	var vid = params.id + "_v"
	var cid = params.id + "_vc"
	var pid = params.id + "_p"
	var autoplay_html = ''
	if (params.autoplay) {
	    autoplay_html = ' autoplay="true"'
	}
	var poster_html = ''
	if (params.poster) {
	    poster_html = ' poster="' + params.poster + '"';
	}
	var html = '<div style="position:relative;"><video id=' + hq( vid ) +
	    ' width=' + hq( params.width ) +
	    ' height=' + hq( params.height ) + autoplay_html +
		poster_html +
	    ' style="position:absolute;top:0;left:0;z-index:1;"></video>' + '<canvas id=' + hq( cid ) +
	    ' width=' + hq( params.width ) +
	    ' height="28" style="position:absolute;top:'+ (params.height - 28) +
	    'px;left:0;z-index:3;"></canvas></div>';
	elm.innerHTML = html;
    }

    // Make multiple <source> elements for <video>
    this.videoSources = function(params) {
	var ret = '', sources = params.sources;
	for(var i=0,l=sources.length;i<l;i++){
	    ret = ret + '<source src=' + hq(sources[i][0]) +
		' type=' + hq(sources[i][1]) + '/>';
	}
	return ret;
    }

    // Insert Shockwave Flash elements
    this.embedShockwave = function(elm, params) {
        var html = '<object classid="clsid:D27CDB6E-AE6D-11cf-96B8-444553540000" codebase="http://download.macromedia.com/pub/shockwave/cabs/flash/swflash.cab#version=6,0,0,0"' +
            ' width='+ hq(params.width) + ' height=' + hq(params.height) +
            '><param name=movie value=' + hq(params.flash.swf) +
            '><param name=quality value="high"><param name=FlashVars value="time=0&autoplay=' + params.autoplay +
	    '&width=' + params.width + '&height=' + params.width + '&file=' + params.flash.video +
	    '&poster=' + params.poster + '"><param name=bgcolor value="#000000"><embed src=' + hq(params.flash.swf) +
            ' FlashVars="time=0&autoplay=' + params.autoplay + '&width=' + params.width + '&height=' + params.height + '&file=' + params.flash.video +
            '&poster=' + params.poster + '" quality="high" bgcolor="#000000" width=' + hq(params.width) +
            ' height=' + hq(params.height) + ' type="application/x-shockwave-flash" pluginspage="http://www.macromedia.com/go/getflashplayer"></embed></object>';
	elm.innerHTML = html
    }

    // Embed Native or Flash Video
  this.init = function(params) {
	this.detect()
	this.element = document.getElementById(params.id)
	if (this.nativeVideo){
            this.embedVideoElement(this.element, params)
	    this.video = document.getElementById(params.id+"_v")
	    this.controller = new VideoController(params, this.videoSources(params))
	} else {
	    this.embedShockwave(this.element, params)
	}
	this.element.style.width = params.width+"px"
	this.element.width = params.width
	this.element.height = params.width
	this.element.style.height = params.height+"px"
    }

    if (params){
	this.init(params)
    }

    if (params.autoplay) {
	poster = document.getElementById(params.id + "_p");
	video = document.getElementById(params.id + "_v");
	if (poster && poster.style.zIndex == 2) {
	    poster.style.zIndex = 1;
	    video.style.zIndex = 2;
	}
    }
};

function VideoController(params, sources){
    var duration = 100, time = 1, progress = 1, muted = false, scrub = null,
    tbx = null, tbw = null, cint = null, params = params, video = null,
    element = null, wrapper = null, poster = null, videoSources = null;

    var drawhbar = function(ctx,w,h,xs,ys,rgba){
	var bxd = w          //bar x distance
	var bxs = xs         //bar x start
	var bxe = bxs+bxd    //bar x end
	var bys = ys         //bar y start
	var bye = ys+h       //bar y end
	ctx.fillStyle = rgba
	ctx.beginPath()
	ctx.moveTo(bxs+4, bys)
	ctx.lineTo(bxe-4, bys)
	ctx.bezierCurveTo(bxe-4, bys, bxe, bys, bxe, bys+4)
	ctx.bezierCurveTo(bxe, bys+4, bxe, bye, bxe-4, bye)
	ctx.lineTo(bxs+4, bye)
	ctx.bezierCurveTo(bxs+4, bye, bxs, bye, bxs, bys+4)
	ctx.bezierCurveTo(bxs, bys+4, bxs, bys, bxs+4, bys)
	ctx.closePath()
	ctx.fill()
    }
    var drawvbar = function(ctx,w,h,x,y,c){
	ctx.fillStyle = c
	ctx.beginPath()
	var r=w/2,xr=x+r,xw=x+w,yh=y+h,yhr=yh-r,yr=y+r
	ctx.beginPath()
	ctx.moveTo(xr,y);ctx.bezierCurveTo(xr,y,xw,y,xw,yr);ctx.lineTo(xw,yhr)
	ctx.bezierCurveTo(xw,yhr,xw,yh,xr,yh);ctx.bezierCurveTo(xr,yh,x,yh,x,yhr)
	ctx.lineTo(x,yr);ctx.bezierCurveTo(x,yr,x,y,xr,y)
	ctx.closePath()
	ctx.fill()
   }
   var drawplay = function(ctx,on,x,y,c){
	ctx.save()
	ctx.translate(x,y)
	ctx.fillStyle=c;
	switch (on) {
	case true:
	    ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,12);
	    ctx.lineTo(4,12);ctx.lineTo(4,0);ctx.closePath();ctx.fill()
	    ctx.beginPath();ctx.moveTo(7,0);ctx.lineTo(7,12);
	    ctx.lineTo(11,12);ctx.lineTo(11,0);ctx.closePath();ctx.fill()
	    break;
	case false:
	    ctx.beginPath()
	    ctx.moveTo(0,0);ctx.lineTo(9,6);ctx.lineTo(0,12);
	    ctx.closePath();ctx.fill();
	    break;
	}
	ctx.restore()
    }
    var drawvolume = function(ctx,m,x,y,c){
	ctx.fillStyle = c
	var yf=y+4,yt=y+11,xe=x+8,xt=x+3
	ctx.beginPath()
	ctx.moveTo(x, yf);ctx.lineTo(x, yt);ctx.lineTo(xt, yt)
	ctx.lineTo(xe, y+15);ctx.lineTo(xe, y);ctx.lineTo(xt, yf)
	ctx.closePath(); ctx.fill()
	if (!m) {
	    ctx.beginPath(); ctx.strokeStyle = c; ctx.lineWidth = 2
	    x=x+10,y=y+4; ctx.moveTo(x,y)
	    ctx.bezierCurveTo(x,y,x+5,y+2.7,x,y+7)
	    ctx.stroke()
	}
    }
    var drawscrub = function(ctx,x,y){
	drawvbar(ctx,11,20,x-4,y,"rgba(255,255,255,1)")
	drawvbar(ctx,7,16,x-2,y+2,"rgba(70,70,70,1)")
    }
    var drawtime = function (ctx,x,y,w){
	drawhbar(ctx,w,8,x,y,"rgba(154,154,154,0.8)")
	drawhbar(ctx,progress/100*w,8,x,y,"rgba(200,200,200,0.8)")
	drawhbar(ctx,time/duration*w,8,x,y,"rgba(255,255,255,1)")
    }
    var draw = function (ctx,w,h){
	ctx.clearRect(0,0,w,h);
	ctx.save();
	ctx.translate(0,h-28)
	ctx.fillStyle = "rgba(20,20,20, 0.7)"
	ctx.fillRect (0,0,w,28)
	tbw = w-61
	tbx = 28
        drawtime(ctx,tbx,10,tbw)
	scrub = (time / duration * tbw) + tbx
        drawscrub(ctx,scrub,4)
	var v = video
	playing = true
	if (v.paused) {
	    playing = false
	}
	drawplay(ctx,playing,10,8,"rgba(255,255,255,1)");
	drawvolume(ctx,muted,w-22,6,"rgba(255,255,255,1)")
	ctx.restore();
    }
    var clear = function(ctx,w,h) {
	ctx.clearRect(0,0,w,h);
    }
    var mouseout = function() {
	var c = element
	var ctx = c.getContext("2d")
	var w = c.width, h = c.height
	clear(ctx,w,h)
	clearInterval(cint)
	c.removeEventListener('mousemove', scrubber, false)
    }
    var mousedown = function (ev) {
        t = this.parentNode.parentNode
	var c = element
	var x = ev.layerX - c.offsetLeft
	var y = ev.layerY - c.offsetTop
	var w = c.width
	var h = c.height
	var v = video
	playing = true
	if (v.paused) {
	    playing = false
	}
	if (x <= 28){
	    if(playing){pause();}else{play();}
	} else if (x >= w-28){
	    if(muted){unmute();}else{mute();}
	} else if (x >= scrub-4 && x <= scrub+8){
	    c.addEventListener('mousemove', scrubber, false)
	} else {
	    var s = Math.round((x - tbx) / tbw * duration)
	    if (s > duration) s = duration
	    if (s < 0) s = 0
	    seek(s)
	}
	var ctx = c.getContext("2d");
	clear(ctx,w,h);
	draw(ctx,w,h);
    }
    var mouseup = function(ev){
	var c = element
	c.removeEventListener('mousemove', scrubber, false)
    }
    var scrubber = function(ev) {
	var c = element
	var x = ev.layerX - c.offsetLeft;
	var s = Math.round((x - tbx) / tbw * duration)
	if (s > duration) s = duration
	if (s < 0) s = 0
	seek(s)
    }
    var updateprogress = function(ev){
	if (ev.lengthComputable) {
	    if (ev.total != 0){
		progress = Math.round(ev.loaded/ev.total*100)
	    }
	    return;
	}
	if (ev.total) {
            progress = (100*ev.loaded/ev.total).toFixed(0)
	}
	return;
    }
    var updatetime = function() {
        var v = video
	var n = "" + Math.round(v.currentTime*10)/10;
	if (n.toString() == "NaN") {
	    time = null;
	} else {
	    time = n;
	}
    }
    var updateduration = function() {
	var v = video
	var n = Math.round(v.duration*10)/10;
	if (n.toString() == "NaN") {
	    duration = null;
	  this.duration = null;
	} else {
	    duration = n;
	  this.duration = n;
	}
    }
    var play = function(){
	if (videoSources) {
		video.innerHTML = videoSources;
		videoSources = null;
	}
	if (poster && poster.style.zIndex == 2) {
	    poster.style.zIndex = 1;
	    video.style.zIndex = 2;
	}
	video.play()
    }
    this.play = play
    var stop = function(){var v = video;v.pause();v.currentTime = 0}
    this.stop = stop
    var pause = function(){video.pause()}
    this.pause = pause
    var mute = function(){video.volume = 0;muted = true}
    this.mute = mute
    var seek = function(t){video.currentTime = t;}
    this.seek = seek
    var unmute = function(){video.volume = 1;muted = false}
    this.unmute = unmute
    var drawcontroller = function(ev) {
        updateduration()
        updatetime()
	var c = element
	var ctx = c.getContext("2d")
	var w = c.width, h = c.height
	draw(ctx,w,h)
    }
    var mouseover = function(ev) {
	var c = element
	var ctx = c.getContext("2d")
	var w = c.width, h = c.height
	draw(ctx,w,h)
	cint = setInterval(drawcontroller, 20)
    }
    this.init = function(params, sources) {
	videoSources = sources;
	element = document.getElementById(params.id + "_vc")
	wrapper = document.getElementById(params.id)
	poster = document.getElementById(params.id + "_p")
	video = document.getElementById(params.id + "_v")
	wrapper.addEventListener('mouseover', mouseover, false)
	wrapper.addEventListener('mouseout', mouseout, false)
	video.addEventListener('loadedmetadata', updateduration, false)
	video.addEventListener('durationchanged', updateduration, false)
	video.addEventListener('timeupdate', updatetime, false)
	video.addEventListener('progress', updateprogress, false)
	element.addEventListener('mousedown', mousedown, false)
	element.addEventListener('mouseup', mouseup, false)
    }
    this.init(params, sources)
}
