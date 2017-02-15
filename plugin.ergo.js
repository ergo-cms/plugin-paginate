
module.exports = {
	name: "Ergo Paginator Plugin",
	url: "https://github.com/ergo-cms/plugin-paginator",
	active: true,
	version: "1.0.1",
	init: function(env, options) { _env = env; },
	default_fields: {
		has_paginator: true, // a simple signal to themes that we're available (probably not very useful however)
		//paginate_count:10,
		//paginate_nextprev:true,
		paginate: function(list, params, list_name) { return _paginate_filter(list, this, params, list_name) }
	}
}





var path = require('path');

//var logColor = "\x1b[34m";
//var logColorReset = "\x1b[0m";

var l = function() { } // function(str) { console.log(logColor+'paginator: '+str+logColorReset); }
var lkv = function() { }// function(str) { console.log(logColor+'paginator-kv: '+str+logColorReset); }

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

function _prep_params(params, data) {
	params.count = params.count || data.paginate_count || 10;
	params.nextprev = params.nextprev;
	if (params.nextprev===undefined && data.paginate_nextprev!==undefined)
		params.nextprev = data.paginate_nextprev;
	if (params.nextprev===undefined) 
		params.nextprev=true;
	return params;
}

function _filename_inject(filename, suffix) {
	var ar = filename.split('.');
	ar[ar.length-2] = ar[ar.length-2]+ '-' + suffix;
	return ar.join('.');
}

function _rename_to_all(data) {
	// Stop this page from actually saving to its current location. Save it to xxx-all.html instead
	var fi = _env.getFileInfoByRelPath(data.fileInfo.relPath)
	//fi.canSave = false;

	// add '-all' to the uri
	fi.destPath = _filename_inject(fi.destPath, 'all');
	fi.destRelPath = _filename_inject(fi.destRelPath, 'all');

	l('saving as ' + fi.destRelPath)
	fi.fields.paginate = _empty_paginator; // ensure we can't become recursive (which would be bad!). This can happen because we've added files during rendering.
}

function _paginate_filter_simple(list, data, params, data_name) {
	params = _prep_params(params, data);
	if (list.length<=params.count)
		return list; // nothing to do!

	// pass 1. genereate the uris and pagination data we'll use
	var items = [];
	for (var i=0; i<list.length; i+=params.count) {
		var page = parseInt(i / params.count, 10) + 1;
		var dest = data.fileInfo.destRelPath;

		if (page>1)
			// add '-pagenum' to the uri
			dest = _filename_inject(data.fileInfo.destRelPath, page);
		
		items.push({uri:dest, page:page, active:false})
	}

	_rename_to_all(data);

	// pass 2. generate the files:
	var template = data.content; 
	//var base_renderer = _env._renderers.findByExt(path.extname(data.fileInfo.relPath)) // use the same language renderer as this used. Probably just 'html'
	var base_renderer_name = 'usematch';

	for (var i=0; i<list.length; i+=params.count) {
		// create a virtual page and add it
		var page = parseInt(i / params.count, 10) + 1;
		var pageIdx = page-1;

		var paginated = {
			item:JSON.parse(JSON.stringify(items)) // make a copy of the list
		}
		paginated.first = pageIdx>0 ? paginated.item[0] : null;
		paginated.last  = pageIdx<items.length-1 ? paginated.item[items.length-1] : 0;
		paginated.prev  = params.nextprev && pageIdx>0 ? paginated.item[pageIdx-1] : null;
		paginated.next  = params.nextprev && pageIdx<items.length-1 ? paginated.item[pageIdx+1] : null;
		var current = paginated.item[pageIdx];
		current.active = true;

		var fields = _extend({}, data, {paginated:paginated})
		fields[data_name] = list.slice(i, i+params.count);
		fields.paginate = _empty_paginator; // because we've still got '@paginate' in the template, we make sure we don't become reentrant
		fields.paginate_nextprev = params.nextprev;

		l('page ' + page + ' =>' + current.uri + ' for fields[' + data_name+']=' + fields[data_name].length)
		_env.addVirtualFile(fields, current.uri, base_renderer_name)
	}


	// return the list of items, unmolested
	return list;
}

/*
a key_value list is:
[
	{
		key:'key1',
		value: [ post1, post3, post2 ... ]
	},
	{
		key:'key2',
		value: [ post3, post2, post4 ...]
	}
	...
]
*/
function _kv_detect(list) {
	return (list.length>0 && !!list[0].key && !!list[0].value && list[0].value.length>0 )
}
function _kv_count_items(list) {
	var count = 0;
	list.forEach(function(pair) {
		count += pair.value.length;
	})
	return count;
}

function _paginate_filter_keyvalue(list, data, params, data_name) {
	params = _prep_params(params, data);
	var kv_count = _kv_count_items(list);
	lkv('count = '+kv_count)
	if (kv_count<=params.count)
		return list; // nothing to do!

	// step 1. Split the keyvalue into sub-lists, so that each page has the required# posts
	var kv_at = 0;
	var list_at = 0;
	var value_at = 0;
	var page = { count:0,list:[], uri:data.fileInfo.destRelPath }
	var pages = [page];  

	while (kv_at < kv_count) {
		lkv('kv_at=' + kv_at + ' list_at=' + list_at + ' value_at='+value_at + ' page.count=' + page.count + ' list.length=' + page.list.length)
		var key = list[list_at].key;
		var values = list[list_at].value;
		var dWant = params.count - page.count;

		if (dWant<=(values.length-value_at)) 
		{ // this item can supply more than what is needed
			page.list.push({key:key, value:values.slice(value_at, value_at+dWant )})
			value_at += dWant;
			page.count += dWant;
			kv_at += dWant;
			lkv('A. added '+key+' ' + page.list[page.list.length-1].value.length)
		} 
		else 
		{ // list is smaller than the page size
			page.list.push({key:key, value:values.slice(value_at, values.length )})
			page.count += values.length-value_at;
			kv_at += values.length-value_at;
			value_at = values.length;
			lkv('B. added '+key+' ' + page.list[page.list.length-1].value.length)
		}

		if (value_at>values.length)
			throw new Error("Paginate. Unexpected overrun in value_at"); // ie the maths is wrong
		if (value_at == values.length) {
			// finished with this key in the list
			lkv('next list item')
			value_at = 0;
			list_at++;
		}

		if (page.count>params.count)
			throw new Error("Paginate. Unexpected overrun in page.count"); // ie the maths is wrong
		if (page.count == params.count) {
			// start a new page
			page = { count:0,list:[], uri:_filename_inject(data.fileInfo.destRelPath, pages.length+1) };
			lkv('new page: ' + page.uri)
			pages.push(page);
		}
	}
	if (page.count==0) // nothing on the final page. remove it from the pages list
		pages.splice(pages.length-1)


	// pass 2. generate the uris and pagination data we'll use
	var items = [];
	for (var i=0; i<pages.length; i++) {
		items.push({uri:pages[i].uri, page:i+1, active:false})
	}

	_rename_to_all(data);

	// pass 3. generate the files:
	var template = data.content; 
	//var base_renderer = _env._renderers.findByExt(path.extname(data.fileInfo.relPath)) // use the same language renderer as this used. Probably just 'html'
	var base_renderer_name = 'usematch';

	for (var i=0; i<pages.length; i++) {
		// create a virtual page and add it
		var page = i + 1;
		var pageIdx = i;

		var paginated = {
			item:JSON.parse(JSON.stringify(items)) // make a copy of the list
		}
		paginated.first = pageIdx>0 ? paginated.item[0] : null;
		paginated.last  = pageIdx<items.length-1 ? paginated.item[items.length-1] : 0;
		paginated.prev  = params.nextprev && pageIdx>0 ? paginated.item[pageIdx-1] : null;
		paginated.next  = params.nextprev && pageIdx<items.length-1 ? paginated.item[pageIdx+1] : null;
		var current = paginated.item[pageIdx];
		current.active = true;

		var fields = _extend({}, data, {paginated:paginated})
		fields[data_name] = pages[i].list;
		fields.paginate = _empty_paginator; // because we've still got '@paginate' in the template, we make sure we don't become reentrant
		fields.paginate_nextprev = params.nextprev;

		lkv('page ' + page + ' =>' + current.uri + ' for fields[' + data_name+']=' + fields[data_name].length)
		_env.addVirtualFile(fields, current.uri, base_renderer_name)
	}


	// return the list of items, unmolested
	return list;
}

// determine the kind of list we have and split into one of two cateories:
// Simple is a normal array:
//		data.posts = [ ]
// KeyValue is used in (eg tags and author lists):
//		list is an array of [{key:'',value:[post1,post2]} ], 
function _paginate_filter(list, data, params, data_name) {
	if (_kv_detect(list))
		return _paginate_filter_keyvalue(list, data, params, data_name);
	else
		return _paginate_filter_simple(list, data, params, data_name);
}
