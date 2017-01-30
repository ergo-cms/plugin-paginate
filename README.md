# Paginator Ergo-CMS plugin

This plugin provides the ability to break a large list of posts into a paginated version. When applied to a single template page, this plugin will generate as many sibling pages as needed. For example, `posts.html` as well as `posts-2.html`, `posts-3.html`, etc. If requested can also generate `posts-all.html`, which is the page that would be generated _without enabling this plugin at all_.


## Installation

In an existing ergo project folder:

```
ergo plugin install paginate
```

## Options 

You may specify the following options in your `config.ergo.js`:

```
default_fields: {
	paginate_count:20, // paginate 20 items per page (default is 10)
	paginate_nextprev: true, // show the previous and next buttons (default is true)
	...
}
```

## Usage Sample

This plugin requires the use of two elements in order to work: 

1. A filter (@paginate), to control the elements in the array, and
1. Tag markup, to control the placement of links and buttons.

### Step 1. Add the filter

Usage example:

```
{{#post @paginate{count:20} }}...
{{/post}}
```

This will add 20 posts per page, before starting a new page. The default is 10.


### Step 2. Add supporting tags

```
{{#post @paginate }}...
{{/post}}

{{#paginated}}
	<ul class="pagination">
		{{#first}}<li><a href="/{{uri}}">&laquo;</a></li>{{/first}}
		{{#prev}}<li><a href="/{{uri}}">&lsaquo;</a></li>{{/prev}}
		{{#item}}<li {{#active}}class="active"{{/active}}><a href="/{{uri}}">{{page}}</a></li>{{/item}}
		{{#next}}<li><a href="/{{uri}}">&rsaquo;</a></li>{{/next}}
		{{#last}}<li><a href="/{{uri}}">&raquo;</a></li>{{/last}}
	</ul>
{{/paginated}}
```

## Advanced Usage - Graceful Support

To gracefully add support if this plugin is enabled or not, in either `theme.ergo.js`, or `config.ergo.js` add the following to the `default_fields` section:

```
...
default_fields: {
	auto_paginate: function(list,params,list_name) { 
		if (!!this.paginate) 
			return this.paginate.call(this, list, params, list_name);
		else
			return list; // do nothing, if paginate not available
		},
		...
}
```

Also, change the above `post.html` to use the updated filter:
```
{{#post @auto_paginate{count:20} }}...
{{/post}}
```

See the default themes provided for ergo-cms to see this implementation.

