"use strict";

var shred = require('shred');

// Response object
var response = function(values)
{
	this.error = false;
	this.data = null;
	this.raw = null;

	this.status = -1;

	if (!values)
	{
		this.error = true;
		return;
	}

	this.status = values.status || 500;

	if (values.content.body && values.content.length > 0)
	{
		this.raw = values.content.body;

		try
		{
			this.data = JSON.parse(values.content.body);
		}
		catch(err)
		{
			this.error = true;
		}
	}

	if (this.data == null)
		this.error = true;
}

response.prototype.isSuccess = function()
{
	return !this.isError();
}

response.prototype.isError = function()
{
	if ((this.error) || (this.status >= 400))
		return true;

	return ((this.data == undefined || this.data == null));
}

// Request object
var request = function(options)
{
	this.options = {
		transport: 'http',

		// base domain
		domain: 'www.lfsworld.net',

		// requested version
		version: 1.5,

		// your ident key
		idk: ''
	};

	// types of requests that can be made
	this.requests = {
		// hotlaps for a given racer
		hl: {
			path: '/pubstat/get_stat2.php?action=hl&racer=%(racer)s'
		},
		// all hotlaps for a specific track & vehicle
		ch: {
			path: '/pubstat/get_stat2.php?action=ch&track=%(track)s&car=%(car)s'
	   	},
		// world records
		wr: { 
			path: '/pubstat/get_stat2.php?action=wr&track=%(track)s&car=%(car)s'
	   	},
		// pbs for a given racer
		pb: { 
			path: '/pubstat/get_stat2.php?action=pb&racer=%(racer)s'
	   	},
		// required fuel/lap for a racer
		fuel: { 
			path: '/pubstat/get_stat2.php?action=fuel&racer=%(racer)s'
	   	},
		// online stats for a racer
		pst: { 
			path: '/pubstat/get_stat2.php?action=pst&racer=%(racer)s'
	   	},
		// all online hosts & racers
		hosts: { 
			path: '/pubstat/get_stat2.php?action=hosts'
	   	},
		// teams
		teams: { 
			path: '/pubstat/get_stat2.php?action=teams'
	   	},
		// hotlap upload log
		hl_log: { 
			path: '/pubstat/get_stat2.php?action=hl_log'
	   	},
		// global counters
		counters: { 
			path: '/pubstat/get_stat2.php?action=counters'
	   	},
		// online highlights, per country
		highlights: {
			path: '/highlight_countries/highlights_%(country)s.txt'
		}
	};

	if (options)
	{
		for (var i in options)
			this.options[i] = options[i];
	}

	// http client
	this.transport = new shred();
}

request.prototype.setOption = function(key, value)
{
	this.options[key] = value;
}

request.prototype.getOption = function(key)
{
	return this.options[key];
}

// partial named, vsprint implementation
// expected sprintf format of %(variablename)type
// ie. %(a)s for a string, named a
request.prototype.vnsprintf = function(fmt, params)
{
	var matches = this.regexMatchAll(/(%\(([a-z0-9\-_]+)\)([sdf]))/g, fmt);

	// for
	// var s = 'asdasdad %(test)s pies %(testing)d';
	// this.regexMatchAll(/(%\(([a-z0-9\-_]+)\)([sdf]))/g, s)
	// we'd get
	// [["%(test)s", "%(test)s", "test", "s"], ["%(testing)d", "%(testing)d", "testing", "d"]]

	var str = fmt;

	for (var i in matches)
	{
		var key = matches[i][2];

		if (!params[key])
			continue;

		var value = params[key];

		// convert
		// TODO this needs to suck less
		switch (matches[i][3])
		{
			case 'd':
				value = parseInt(value);
				break;
			case 'f':
				value = new Number(value);
				break;
			case 's':
			default:
				value = new String(value);
				break;
		}

		str.replace(matches[i][0], value);
	}

	return str;
}

request.prototype.regexMatchAll = function(regex, haystack)
{
	var matches = [];
	var match = null;

	while ((match = regex.exec(haystack)) != null)
	{
		var matchArray = [];

		for (var i in match)
		{
			if (parseInt(i) == i)
				matchArray.push(match[i]);
		}

		matches.push(matchArray);
	}

	return matches;
}

request.prototype.fetch = function(type, params, callback)
{
	if (!this.requests[type])
		return;

	var url = this.options.transport + '://' + this.options.domain + 
		this.vnsprintf(this.requests[type].path, params) + 
		'&idk=' + this.options.idk +
		'&version=' + this.options.version + '&s=1';

	var handler = function(res)
	{
		var r = new response(res);

		if (callback)
			callback(r);
	};

	this.transport.get({
		url: url,
		headers: {
			'User-Agent': 'lfsworld.js (Shred)'
		},
		on: {
			200: handler,
			response: handler
		}
	});
}

// convenience functions
request.prototype.getHl = function(racer, callback)
{
	this.fetch('hl', { racer: racer }, callback);
}

request.prototype.getCh = function(racer, car, callback)
{
	this.fetch('hl', { racer: racer, car: car }, callback);
}

request.prototype.getWr = function(track, car, callback)
{
	this.fetch('wr', { track: track, car: car }, callback);
}

request.prototype.getPb = function(racer, callback)
{
	this.fetch('pb', { racer: racer }, callback);
}

request.prototype.getFuel = function(racer, callback)
{
	this.fetch('fuel', { racer: racer }, callback);
}

request.prototype.getPst = function(racer, callback)
{
	this.fetch('pst', { racer: racer }, callback);
}

request.prototype.getHosts = function(callback)
{
	this.fetch('hosts', {}, callback);
}

request.prototype.getTeams = function(callback)
{
	this.fetch('teams', {}, callback);
}

request.prototype.getHl_log = function(callback)
{
	this.fetch('hl_log', {}, callback);
}

request.prototype.getHllog = function(callback)
{
	this.getHl_log(callback);
}

request.prototype.getCounters = function(callback)
{
	this.fetch('counters', {}, callback);
}

request.prototype.getHighlights = function(country, callback)
{
	this.fetch('highlights', { country: country }, callback);
}

// export the request object
exports = module.exports = request;
