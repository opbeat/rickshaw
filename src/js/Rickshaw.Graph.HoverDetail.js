Rickshaw.namespace('Rickshaw.Graph.HoverDetail');

Rickshaw.Graph.HoverDetail = Rickshaw.Class.create({

	initialize: function(args) {

		var graph = this.graph = args.graph;

		this.xFormatter = args.xFormatter || function(x) {
			return new Date( x * 1000 ).toUTCString();
		};

		this.yFormatter = args.yFormatter || function(y) {
			return y.toFixed(2);
		};

		var element = this.element = document.createElement('div');
		element.className = 'detail';
	
		graph.element.appendChild(element);

		this.visible = true;
		this.lastEvent = null;
		this._addListeners();

		this.onShow = args.onShow;
		this.onHide = args.onHide;
		this.onRender = args.onRender;

		this.formatter = args.formatter || this.formatter;
	},

	formatter: function(series, x, y, formattedX, formattedY, d) {
		return series.name + ':&nbsp;' + formattedY;
	},

	update: function(e) {

		e = e || this.lastEvent;
		if (!e) return;
		this.lastEvent = e;

		if (!e.target.nodeName.match(/^(path|svg|rect)$/)) return;

		var graph = this.graph;

		var eventX = e.offsetX || e.layerX;
		var eventY = e.offsetY || e.layerY;

		var domainX = graph.x.invert(eventX);
		var stackedData = graph.data;

		var topSeriesData = stackedData.slice(-1).shift();

		var order = 0;

		var detail = graph.series.active()
			.map(function(s){
				var domainIndexScale = d3.scale.linear()
					.domain([s.data[0].x, s.data.slice(-1).shift().x])
					.range([0, s.data.length]);

				var approximateIndex = Math.floor(domainIndexScale(domainX));
				var dataIndex = Math.min(approximateIndex || 0, s.data.length - 1);

				for (var i = approximateIndex; i < s.data.length - 1;) {

					if (!s.data[i] || !s.data[i + 1]) {
						break;
					}

					if (s.data[i].x <= domainX && s.data[i + 1].x > domainX) {
						// Figure out which is closer
						if( (domainX - s.data[i].x) > (s.data[i + 1].x - domainX))
							dataIndex = i+1;
						else
							dataIndex = i;

						break;
					}
					if (s.data[i + 1].x <= domainX) { i++ } else { i-- }
				}

				return {order: order++, series: s, name: s.name, value: s.data[dataIndex]  };
			});
		

		// var domainX = stackedData[0][dataIndex].x;
		var formattedXValue = this.xFormatter(domainX);
		// var graphX = graph.x(domainX);
		// var formattedXValue;

		// var detail = graph.series.active()
		// 	.map( function(s) { return { order: order++, series: s, name: s.name, value: s.data[dataIndex] } } );

		var activeItem;

		var sortFn = function(a, b) {
			return (a.value.y) - (b.value.y);
			// return (a.value.y0 + a.value.y) - (b.value.y0 + b.value.y);
		};

		var domainMouseY = graph.y.magnitude.invert(graph.element.offsetHeight - eventY);

		var minDistMouseY = Number.MAX_VALUE;

		detail/*.sort(sortFn)*/.forEach( function(d) {
			if(d.value)
			{
				d.formattedYValue = (this.yFormatter.constructor == Array) ?
					this.yFormatter[detail.indexOf(d)](d.value.y) :
					this.yFormatter(d.value.y);

				formattedXValue = this.xFormatter(domainX);
				d.graphX = graph.x(d.value.x); //graphX;
				d.graphY = graph.y(d.value.y);
				
				var yDist = Math.abs(d.graphY - graph.y(domainMouseY));
				if( yDist < minDistMouseY)
				{
					minDistMouseY = yDist;
					activeItem = d;
				}
				/*
				if (domainMouseY > d.value.y /*&& domainMouseY < d.value.y0 + d.value.y* / && !activeItem) {
					activeItem = d;
					d.active = true;
				}*/
			}

		}, this );

		if(activeItem)
			activeItem.active = true;

		this.element.innerHTML = '';
		// this.element.style.left = graph.x(domainX) + 'px';

		if (this.visible && activeItem) {
			this.render( {
				detail: detail,
				domainX: domainX,
				formattedXValue: formattedXValue,
				mouseX: eventX,
				mouseY: eventY
			} );
		}
	},

	hide: function() {
		this.visible = false;
		this.element.classList.add('inactive');

		if (typeof this.onHide == 'function') {
			this.onHide();
		}
	},

	show: function() {
		this.visible = true;
		this.element.classList.remove('inactive');

		if (typeof this.onShow == 'function') {
			this.onShow();
		}
	},

	render: function(args) {

		var detail = args.detail;
		var domainX = args.domainX;

		var mouseX = args.mouseX;
		var mouseY = args.mouseY;

		var formattedXValue = args.formattedXValue;

		var d

		var xLabel = document.createElement('div');
		xLabel.className = 'x_label';
		xLabel.innerHTML = formattedXValue;
		this.element.appendChild(xLabel);

		detail.forEach( function(d) {

			var item = document.createElement('div');
			item.className = 'item';
			item.innerHTML = this.formatter(d.series, domainX, d.value.y, formattedXValue, d.formattedYValue, d);
			item.style.top = this.graph.y(d.value.y) + 'px';
			item.style.left = this.graph.x(d.value.x) + 'px';
			this.element.appendChild(item);

			var dot = document.createElement('div');
			dot.className = 'dot';
			dot.style.top = item.style.top;
			dot.style.left = item.style.left;

			dot.style.borderColor = d.series.color;

			this.element.appendChild(dot);

			if (d.active) {
				item.className = 'item active';
				dot.className = 'dot active';
			}

		}, this );

		this.show();

		if (typeof this.onRender == 'function') {
			this.onRender(args);
		}
	},

	_addListeners: function() {

		this.graph.element.addEventListener(
			'mousemove',
			function(e) {
				this.visible = true;
				this.update(e)
			}.bind(this),
			false
		);

		this.graph.onUpdate( function() { this.update() }.bind(this) );

		this.graph.element.addEventListener(
			'mouseout',
			function(e) {
				if (e.relatedTarget && !(e.relatedTarget.compareDocumentPosition(this.graph.element) & Node.DOCUMENT_POSITION_CONTAINS)) {
					this.hide();
				}
			 }.bind(this),
			false
		);
	}
});

