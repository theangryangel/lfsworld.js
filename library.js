"use strict";

var shred = require('shred');

/**
 * The **request** object is the starting point for any interaction with
 * LFSWorld's API, using lfsworld.js. To begin off you must create an instance of the request object:
 * `var lfsworld = new request({ idk: 'your-ident-key' });`
 *
 * Before making any requests, at **minimum** you must supply your ident key.
 * You can either do this at instantiation or at a later point in time using the
 * [setOption](#setOption) method. 
 *
 * The request object supplies a number of convenience functions to query
 * LFSWorld. Lets take the current online hosts as an example. In the following
 * code snippet the following is happening:
 *
 *   - An Instance of the request object is being created
 *   - A request is being created, to ask LFSWorld what the current online hosts
 *  are, in this example the first argument to getHosts is a callback
 *   - When a request is complete, the callback is called
 *   - The callback then checks to see if the response is an error, and if it
 *  does it outputs the raw response from LFSWorld to the console
 *   - If there was no error it outputs the parsed response to the console
 *
 * `var lfsworld = new request({ idk: 'your-ident-key' });
 * lfsworld.getHosts(function(res) {
 * 	if (res.isError())
 *	{
 *		console.error(res.raw);
 *		return;
 *	}
 *	console.log(res.data);
 * });`
 *
 * @class request
 * @constructor
 * @param {Object} options See setOptions for a full list of setable options
 */
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
			path: '/pubstat/get_stat2.php?action=hl&racer=%(racer)s',
			minver: 1.5
		},
		// all hotlaps for a specific track & vehicle
		ch: {
			path: '/pubstat/get_stat2.php?action=ch&track=%(track)s&car=%(car)s',
			minver: 1.5
	   	},
		// world records
		wr: { 
			path: '/pubstat/get_stat2.php?action=wr&track=%(track)s&car=%(car)s',
			minver: 1.5
	   	},
		// pbs for a given racer
		pb: { 
			path: '/pubstat/get_stat2.php?action=pb&racer=%(racer)s',
			minver: 1.5
	   	},
		// required fuel/lap for a racer
		fuel: { 
			path: '/pubstat/get_stat2.php?action=fuel&racer=%(racer)s',
			minver: 1.5
	   	},
		// online stats for a racer
		pst: { 
			path: '/pubstat/get_stat2.php?action=pst&racer=%(racer)s',
			minver: 1.5
	   	},
		// all online hosts & racers
		hosts: { 
			path: '/pubstat/get_stat2.php?action=hosts',
			minver: 1.5
	   	},
		// teams
		teams: { 
			path: '/pubstat/get_stat2.php?action=teams',
			minver: 1.5
	   	},
		// hotlap upload log
		hl_log: { 
			path: '/pubstat/get_stat2.php?action=hl_log',
			minver: 1.5
	   	},
		// global counters
		counters: { 
			path: '/pubstat/get_stat2.php?action=counters',
			minver: 1.5
	   	},
		// online highlights, per country
		highlights: {
			path: '/highlight_countries/highlights_%(country)s.txt',
			minver: 1.5
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

/**
 * Sets the value for a given option. Valid options are:
 *    + transport: http or https
 *    + domain: defaults to "www.lfsworld.net"
 *    + version: the version requests are sent as, defaults to 1.5
 *    + idk: your ident key, **must** be set
 *
 * @method setOption
 * @param {String} key
 * @return {Object}
 */
request.prototype.setOption = function(key, value)
{
	this.options[key] = value;
	return this;
}

/**
 * Returns the value of the requested option
 *
 * @param {String} key
 */
request.prototype.getOption = function(key)
{
	return this.options[key];
}

/**
 * Allows a user to add new API calls, without patching the source, if 
 * lfsworld.js has not yet been updated.
 *
 * For example, to add a duplication of the hl request you could do the following:
 * `request.fixUp('hl2', '/pubstat/get_stat2.php?action=hl&racer=%(racer)s', 1.3)`
 *
 * @param {String} key Key used to refer to the request type
 * @param {String} path Absolute path to the API call, any variables must be added and supported by the vnsprintf implementation
 * @param {Number} minver Minimum supported version
 * @return {Boolean} true on success, if returned false most likely use to potential overwrite
 */
request.prototype.fixUp = function(key, path, minver)
{
	if (this.requests[key])
		return false;

	this.requests[key] = {
		path: path,
		minver: minver
	};
}

/**
 * vsnprintf
 * Partial named, vsprint implementation 
 * expected sprintf format of %(variablename)type
 *
 * If you add any new request, using [fixUp](#fixUp) then please be
 * aware your path MUST support variables in this manner.
 *
 * @example
 * request.vnsprintf("%(a)s", {a: "value"});
 *
 * @method vsnprintf
 * @param {String} format
 * @param {Object} params
 * @return {String}
 */
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

/**
 * regexMatchAll
 *
 * @method regexMatchAll
 * @param {Regex} regex
 * @param {String} haystack
 * @return {Array}
 * @private
 */
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

/**
 * Using fetch you can call and retreive any type of LFSWorld call, that
 * lfsworld.js knows about. For convenience I would recommend using the
 * convenience functions instead, however they are only proxies to fetch.
 *
 * For example you could use fetch, instead of getHl, to get all hotlaps 
 * of a specific racer:
 * `request.fetch('hl', { racer: racername }, callback)`
 *
 * The convenience functions are not automatically created, so if a new call is
 * added via the fixup method, you would have to use the fetch method.
 *
 * @param {String} type
 * @param {Object} params
 * @param {Function} callback
 */
request.prototype.fetch = function(type, params, callback)
{
	// unknown request type
	if (!this.requests[type])
	{
		callback();
		return;
	}

	// not supported by the set version in the options
	if (this.requests[type].minver > this.options.version)
	{
		callback();
		return;
	}

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

/**
 * Convenience function to request all hotlaps for a given racer.
 *
 * @param {String} racer
 * @param {Function} callback
 */
request.prototype.getHl = function(racer, callback)
{
	this.fetch('hl', { racer: racer }, callback);
}

/**
 * Convenience function to request hotlaps for a given racer in a specific
 * vehicle.
 *
 * @param {String} racer
 * @param {String} car
 * @param {String} track
 * @param {Function} callback
 */
request.prototype.getCh = function(racer, car, track, callback)
{
	this.fetch('hl', { racer: racer, car: car, track: track }, callback);
}

/**
 * Convenience function to request world records for a given track or vehicle.
 *
 * @param {String} car
 * @param {String} track
 * @param {Function} callback
 */
request.prototype.getWr = function(track, car, callback)
{
	this.fetch('wr', { track: track, car: car }, callback);
}

/**
 * Convenience function to request personal bests for a given racer.
 *
 * @param {String} racer
 * @param {Function} callback
 */
request.prototype.getPb = function(racer, callback)
{
	this.fetch('pb', { racer: racer }, callback);
}

/**
 * Convenience function to request fuel usage per lap for a given racer.
 *
 * @param {String} racer
 * @param {Function} callback
 */
request.prototype.getFuel = function(racer, callback)
{
	this.fetch('fuel', { racer: racer }, callback);
}

/**
 * Convenience function to request online racer statistics.
 *
 * @param {String} racer
 * @param {Function} callback
 */
request.prototype.getPst = function(racer, callback)
{
	this.fetch('pst', { racer: racer }, callback);
}

/**
 * Convenience function to request online hosts and racers.
 *
 * @param {Function} callback
 */
request.prototype.getHosts = function(callback)
{
	this.fetch('hosts', {}, callback);
}

/**
 * Convenience function to request team information.
 * 
 * @param {Function} callback
 */
request.prototype.getTeams = function(callback)
{
	this.fetch('teams', {}, callback);
}

/**
 * Convenience function to request hotlap upload log.
 *
 * @param {Function} callback
 */
request.prototype.getHl_log = function(callback)
{
	this.fetch('hl_log', {}, callback);
}

/**
 * Alias for [getHl_log](#getHl_log).
 * 
 * @param {Function} callback
 */
request.prototype.getHllog = function(callback)
{
	this.getHl_log(callback);
}

/**
 * Convenience function to request global lap counts of all vehicles and tracks.
 *
 * @param {Function} callback
 */
request.prototype.getCounters = function(callback)
{
	this.fetch('counters', {}, callback);
}

/**
 * Convenience function to request highlights log for a given country. Contains
 * information such as winners, personal bests and world records.
 *
 * Data returned is newline (\n) delimited HTML.
 *
 * @param {String} country 
 * @param {Function} callback
 */
request.prototype.getHighlights = function(country, callback)
{
	this.fetch('highlights', { country: country }, callback);
}

/**
 * The **response** object is handed to your callback functions after a request
 * has been made to the LFSWorld API. You'll be mostly using it in order to
 * determine if the request was successful, as well as using it to interrogate
 * the results.
 *
 * This object should not be manually created.
 *
 * @class response
 * @constructor
 * @param {Object} values Unparsed response from LFSWorld
 */
var response = function(values)
{
	/**
	 * Internally set to whether or not there was an error. This should **not**
	 * be checked. Instead refer to [isError](#isError)
	 * @type {Boolean}
	 * @default false
	 * @memberOf response
	 * @private
	 */
	this.error = false;

	/**
	 * Parsed data from LFSWorld. This is the property you should use. No
	 * protection is provided against overwriting or altering.
	 *
	 * @type {Object}
	 * @default null
	 * @memberOf response
	 */
	this.data = null;

	/**
	 * If you need to look at the raw response from LFSWorld, use this property. 
	 *
	 * @type {String}
	 * @default null
	 * @memberOf response
	 */
	this.raw = null;

	/**
	 * HTTP status code response from LFSWorld. Please note that the LFSWorld
	 * API responses with 200 (success) even if there was an error, such as
	 * improper Ident Key. It should not be relied on. Use [isError](#isError).
	 *
	 * @type {Number}
	 * @default -1
	 * @memberOf response
	 */
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

/**
 * Should be used by **all** registered callbacks to determine if the request to
 * the LFSWorld API was successful. Failure to do so may result in undesirable
 * behaviour.
 *
 * @method isError
 * @return {Boolean} Returns true if the response was an error
 */
response.prototype.isError = function()
{
	if ((this.error) || (this.status >= 400))
		return true;

	return ((this.data == undefined || this.data == null));
}

// export the request object
exports = module.exports = request;
