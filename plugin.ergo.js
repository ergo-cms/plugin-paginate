var path = require('path');

var l = function(str) { console.log('paginator: '+str); }

function _extend(origin) { // shallow extend only
	for (var a=1; a<arguments.length; a++) {
		var add = arguments[a];
		if (add === null || typeof add !== 'object')
			continue;

		var keys = Object.keys(add)
		var i = keys.length
		while (i--) {
			origin[keys[i]] = add[keys[i]]
		}
	}

	return origin
}

function _empty_paginator(list) { return list; }

function _paginate_filter(list, data, params, data_name) {
	params.count = params.count || data.paginate_count || 10;
	//l('size=' + list.length)
	if (list.length<=params.count)
		return list; // nothing to do!
	// pass 1. genereate the uris and pagination data we'll use
	var items = [];
	for (var i=0; i<list.length; i+=params.count) {
		var page = parseInt(i / params.count, 10) + 1;
		var dest = data.fileInfo.destRelPath;

		if (page>1) {
			// add '-pagenum' to the uri
			dest = dest.split('.');
			dest[dest.length-2] = dest[dest.length-2]+ '-' + page;
			dest = dest.join('.')
		}
		items.push({uri:dest, page:page, active:false})
	}


	// pass 2. generate the files:
	var template = data.content; 
	//var base_renderer = _env._renderers.findByExt(path.extname(data.fileInfo.relPath)) // use the same language renderer as this used. Probably just 'html'
	var base_renderer_name = 'usematch';

	for (var i=0; i<list.length; i+=params.count) {
		// create a virtual page and add it
		var page = parseInt(i / params.count, 10) + 1;
		//var page_content = '{{#paginator_container}}' + template + '{{/paginator_container}}'; 
		var paginated = {
			first:items[0],
			last:items[items.length-1],
			item:JSON.parse(JSON.stringify(items))
		}
		var current = paginated.item[page-1];
		//if (page>1)
		//	paginated.item[page-2].active = false; // deactivate previous entry
		current.active = true;
		var fields = _extend({}, data, {paginated:paginated})
		fields[data_name] = list.slice(i, i+params.count);
		fields.paginate = _empty_paginator; // because we've still got '@paginate' in the template, we make sure we don't become reentrant
		l('page ' + page + ' =>' + current.uri + ' for fields[' + data_name+']=' + fields[data_name].length)
		_env.addVirtualFile(fields, current.uri, base_renderer_name)
	}

	// Stop this page from actually saving to its current location. Save it to xxx-all.html instead
	var fi = _env.getFileInfoByRelPath(data.fileInfo.relPath)
	//fi.canSave = false;

	// add '-all' to the uri
	var ar = fi.destPath.split('.');
	ar[ar.length-2] = ar[ar.length-2]+ '-all';
	fi.destPath = ar.join('.');

	ar = fi.destRelPath.split('.');
	ar[ar.length-2] = ar[ar.length-2]+ '-all';
	fi.destRelPath = ar.join('.');
	l('saving as ' + fi.destRelPath)
	fi.fields.paginate = _empty_paginator; // ensure we can't become recursive (which would be bad!). This can happen because we've added files during rendering.

	// return the list of items, unmolested
	return list;
}


module.exports = {
	name: "Ergo Paginator Plugin",
	url: "https://github.com/ergo-cms/plugin-paginator",
	active: true,
	init: function(env, options) { _env = env; },
	default_fields: {
		has_paginator: true, // a simple signal to themes that we're available (probably not very useful, however)
		paginate_count:5,
		paginate: function(list, params, list_name) { return _paginate_filter(list, this, params, list_name) }
	}
}


