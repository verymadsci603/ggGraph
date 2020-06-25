/**
 * @brief   ggGraphs
 *
 * @author  Phil Braica  HoshiKata@aol.com
 *
 * @copyright 2020, Philip Braica, MIT License
 *
 */

class LineSeries {
    constructor(seriesOptions, xGuid, yGuid, zGuid = '', valuesGuid = '', colorsGuid = '', symbolsGuid = '', labelsGuid = '') {
        this.seriesOptions = seriesOptions;
        this.xGuid = xGuid;
        this.yGuid = yGuid;
        this.zGuid = zGuid;
        this.vGuid = valuesGuid;
        this.cGuid = colorsGuid;
        this.sGuid = symbolsGuid;
        this.lGuid = labelsGuid;
    }
            
    getDataGuid(axis) {
        return axis === 'z' ? this.zGuid : (axis === 'y' ? this.yGuid : this.xGuid);
    }
    
    getData(axis) {
        return ggGraph_DataHive.get_dataSeries(this.getDataGuid(axis));
    }
            
    min(axis) {
        let d = this.getDataGuid(axis);
        return ggGraph_DataHive.min(d);
    }
    
    max(axis) {
        let d = this.getDataGuid(axis);
        return ggGraph_DataHive.max(d);
    }

    fixBounds(bounds, seriesData) {
        if (bounds === null || bounds === undefined) {
            return [seriesData.min(), seriesData.max()];
        }	
        return bounds;
    }
    
    getBounds(is2D) {
        if (is2D) {
            return [[min('x'), max('x')], [min('y'), max('y')]]
        }
        return [[min('x'), max('x')], [min('y'), max('y')], [min('z'), max('z')]]
    }
    
    /**
     * @brief 	Draw a line graph, one color, no markers.
     * 
     * @param 	ctx		Canvas context.
     * @param 	lpx		Last pixel X position.
     * @param 	lpy		Last pixel Y position.
     * @param 	xData	X series data values array.
     * @param 	yData	Y series data values array.
     * @param 	xg 		X gain.
     * @param   xo		X offset.
     * @param 	yg 		Y gain.
     * @param   yo		Y offset.
     */
    _draw2DSegment_Line(ctx, lpx, lpy, xData, yData, xg, xo, yg, yo) {
        let len = xData.length < yData.length ? xData.length : yData.length;
        let xp = lpx === null ? (xData[0] * xg) + xo : lpx;
        let yp = lpy === null ? (yData[0] * yg) + yo : lpy;
        for (let ii = 0; ii < len; ii++) {
            ctx.moveTo(xp, yp);				
            xp = (xData[ii] * xg) + xo;
            yp = (yData[ii] * yg) + yo;
            ctx.lineTo(xp, yp);
        }
        return xp, yp;
    }
    
    /**
     * @brief 	Draw a line graph, one color, no markers.
     * 
     * @param 	ctx		Canvas context.
     * @param 	xData	X series data values array.
     * @param 	yData	Y series data values array.
     * @param 	xg 		X gain.
     * @param   xo		X offset.
     * @param 	yg 		Y gain.
     * @param   yo		Y offset.
     */
    _draw2DSegment_Marker(ctx, xData, yData, xg, xo, yg, yo) {
        
        let len = xData.length < yData.length ? xData.length : yData.length;
        let rad = this.seriesOptions.defaultMarkerSize / 2;
        for (let ii = 0; ii < len; ii++) {
            let xp = xData[ii]*xg + xo;
            let yp = yData[ii]*yg + yo;
            
            // Just squares for now.
            ctx.strokeRect(xp - rad, yp - rad, xp + rad, yp + rad);
        }
    }
    
    /**
     * @brief   Find the "best" mouse over point.
     *
     * @param   x       Data converted "x" value.
     * @param   y       Data converted "y" value.
     * @param   dx      20 pixels, in x-screen data space.
     * @param   dy      20 pixels, in y-screen data space.
     * @param   sx      Scale x value to x screen.
     * @param   sy      Scale y value to y screen.
     * @param   best    {found: false, range: undefined, series: undefined, cache: -1, index: -1 };
     *
     * @return  Updated best (or existing best).
     */
    mouseOver2D(x, y, dx, dy, sx, sy, best) {
        
        let xd = this.getData('x');
        let yd = this.getData('y');
        let cacheLen = xd.cache.length;
        let lx = x - dx;
        let hx = x + dx;
        let ly = y - dy;
        let hy = y + dy;
        let bestCache = -1;
        let bestIndex = -1;
        // We do squared range so. 
        sx = sx * sx;
        sy = sy * sy;
        let bestRange = best.range !== undefined ? best.range : 1 + dx * dx * sx + dy * dy * sy;
        for (let ii = 0; ii < cacheLen; ii++) {
            if ((xd.mins[ii] > hx) || (xd.maxs[ii] < lx) || 
                (yd.mins[ii] > hy) || (yd.maxs[ii] < ly)) {					
                continue;
            }
            let xData = xd.cache[ii];
            let yData = yd.cache[ii];            
            let len = xData.length < yData.length ? xData.length : yData.length;
            
            for (let jj = 0; jj < len; jj++) {
                let dex = xData[jj] - x;
                let dey = yData[jj] - y;
                let rng = (dex * dex * sx) + (dey * dey * sy);
                if (rng < bestRange) { 
                    bestCache = ii;
                    bestIndex = jj;
                    bestRange = rng;
                }
            }
        }
        if (bestCache !== -1) {
            best = {
                range: bestRange,
                series: this,
                cache: bestCache,
                index: bestIndex};
        }
        return best;
    }
    
    /**
     * @brief   Given a "best", compute the sundry info to plot it, then call the easy to over ride plot.
     *
     * @param   ctx         Context to plot on.
     * @param   layout      Layout.
     * @param   bounds      Data bounds of the axis for scaling.
     * @param   best        The "best" object.
     * @param   x_screen    X screen position.
     * @param   y_screen    Y screen position.
     * @param   x_value     X data value.
     * @param   y_value     Y data value.
     */
    drawMouseOverMarkerAndText(ctx, layout, bounds, best, x_screen, y_screen, x_value, y_value) {
        let rad = objectExists(this.seriesOptions.defaultMarkerSize) ? this.seriesOptions.defaultMarkerSize : 2;
        rad = rad < 4 ? 4 : rad;
        let radh = rad / 2;

        let clr = this.seriesOptions.defaultMarkerColor;
        clr = objectExists(clr) ? clr : this.seriesOptions.defaultLineColor;
        clr = objectExists(clr) ? clr : '#000000';
        ctx.strokeStyle = clr;
        // Box it.
        ctx.strokeRect(x_screen - radh + 1, y_screen - radh, rad, rad);

        let x_str = 'x: ' + x_value;
        let y_str = 'y: ' + y_value;
        let tw_n = objectExists(this.seriesOptions.name) ? ctx.measureText(this.seriesOptions.name).width : 0;
        let tw_x = ctx.measureText(x_str).width;
        let tw_y = ctx.measureText(y_str).width;
        let tw = tw_x > tw_y ? 
            (tw_x > tw_n ? tw_x : tw_n) : 
            (tw_y > tw_n ? tw_y : tw_n);
        
        // Background.
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        let triangle = 4;
        let fontSize = 11;
        let fontSize2 = fontSize + fontSize;
        let fontSize3 = fontSize2 + fontSize
        let yoff = (tw_n > 0) ? y_screen - triangle - fontSize3 - fontSize : y_screen - triangle - fontSize3;
        let ybot = (tw_n > 0) ? yoff + fontSize3 + 4 : yoff + fontSize2 + 4;
        ctx.moveTo(x_screen - tw/2 - 2, yoff);
        ctx.lineTo(x_screen - tw/2 - 2 + tw + 4, yoff);
        ctx.lineTo(x_screen - tw/2 - 2 + tw + 4, ybot);
        ctx.lineTo(x_screen - tw/2 - 2 + tw/2 + 4 + triangle, ybot);
        ctx.lineTo(x_screen - tw/2 - 2 + tw/2 + 4, ybot + triangle);
        ctx.lineTo(x_screen - tw/2 - 2 + tw/2 + 4 - triangle, ybot);
        ctx.lineTo(x_screen - tw/2 - 2, ybot);
        ctx.lineTo(x_screen - tw/2 - 2, yoff);
        ctx.stroke();
        ctx.fill();
        
        // Text.
        ctx.font = "11px verdana";        
        ctx.fillStyle = '#000000';        
        if (tw_n > 0) {            
            ctx.fillText(this.seriesOptions.name, x_screen - tw/2, yoff + fontSize - 1);
            ctx.fillText(x_str, x_screen - tw/2, yoff + fontSize2 - 1);
            ctx.fillText(y_str, x_screen - tw/2, yoff + fontSize3 - 1);
        } else {            
            ctx.fillText(x_str, x_screen - tw/2, yoff + fontSize - 1);
            ctx.fillText(y_str, x_screen - tw/2, yoff + fontSize2 - 1);
        }
    }
    
    /**
     * @brief   Given a "best", compute the sundry info to plot it, then call the easy to over ride plot.
     *
     * @param   ctx     Context to plot on.
     * @param   layout  Layout.
     * @param   bounds  Data bounds of the axis for scaling.
     * @param   best    The "best" object.
     */
    drawMouseOver2D(ctx, layout, bounds, best) {
        let x = this.getData('x').cache[best.cache][best.index];
        let y = this.getData('y').cache[best.cache][best.index];
        
        // pixel = (data - db[0])* (cb[1] - cb[0])/(db[1] - db[0]) + cb[0]
        //       = data * (cb[1] - cb[0])/(db[1] - db[0]) - db[0] * (cb[1] - cb[0])/(db[1] - db[0]) + cb[0]
        let xg = layout.w / (bounds.x.max - bounds.x.min);
        let xo = -bounds.x.min * xg + layout.x;
        let yg = layout.h / (bounds.y.max - bounds.y.min);
        let yo = -bounds.y.min * yg + layout.y;
        let xp = x * xg + xo;
        let yp = y * yg + yo;
        this.drawMouseOverMarkerAndText(ctx, layout, bounds, best, xp, yp, x, y);
    }
    
    /**
     * @brief   Render to the context.
     *
     * @param   ctx             Context 2D.
     * @param   dataBounds      Restriction bounds.
     * @param   layout          Where to paint.
     */
    draw2D(ctx, dataBounds, layout) {
        
        let x = this.getData('x');
        let y = this.getData('y');
        let lpx = null;
        let lpy = null;
        
        // pixel = (data - db[0])* (cb[1] - cb[0])/(db[1] - db[0]) + cb[0]
        //       = data * (cb[1] - cb[0])/(db[1] - db[0]) - db[0] * (cb[1] - cb[0])/(db[1] - db[0]) + cb[0]
        let xg = layout.w / (dataBounds.xBounds.max - dataBounds.xBounds.min);
        let xo = -dataBounds.xBounds.min * xg + layout.x;
        let yg = layout.h / (dataBounds.yBounds.max - dataBounds.yBounds.min);
        let yo = -dataBounds.yBounds.min * yg + layout.y;
        
        let accel = _drawAccelerationType(this.seriesOptions);
        let cacheLen = x.cache.length;
        
        // Generic line plot?
        if (accel == 0) {					
            ctx.strokeStyle = this.seriesOptions.defaultLineColor;
            ctx.beginPath();
            for (let ii = 0; ii < cacheLen; ii++) {
                if (x.mins[ii] > dataBounds.xBounds.max || x.maxs[ii] < dataBounds.xBounds.min || 
                    y.mins[ii] > dataBounds.yBounds.max || y.maxs[ii] < dataBounds.yBounds.min) {					
                    continue;
                }
                lpx, lpy = this._draw2DSegment_Line(ctx, lpx, lpy, x.cache[ii], y.cache[ii], xg, xo, yg, yo);                
            }
            ctx.stroke();
        }
            
        // Generic marker plot?
        if (accel == 1)  {
            ctx.strokeStyle = this.seriesOptions.defaultMarkerColor;
            for (let ii = 0; ii < cacheLen; ii++) {
                if (x.mins[ii] >= dataBounds.xBounds.min && x.maxs[ii] <= dataBounds.xBounds.max && 
                    y.mins[ii] >= dataBounds.yBounds.min && y.maxs[ii] <= dataBounds.yBounds.max) {					

                    this._draw2DSegment_Marker(ctx, x.cache[ii], y.cache[ii], xg, xo, yg, yo);
                }
            }
        }
        
        // Generic line & marker plot?
        if (accel == 2)  {				
            for (let ii = 0; ii < x.length; ii++) {
                if (x.mins[ii] >= dataBounds.xBounds.min && x.maxs[ii] <= dataBounds.xBounds.max && 
                    y.mins[ii] >= dataBounds.yBounds.min && y.maxs[ii] <= dataBounds.yBounds.max) {

                    ctx.strokeStyle = this.seriesOptions.defaultLineColor;
                    ctx.beginPath();                    
                    lpx, lpy = this._draw2DSegment_Line(ctx, lpx, lpy, x.cache[ii], y.cache[ii], xg, xo, yg, yo);
                    ctx.stroke();
                    
                    ctx.strokeStyle = this.seriesOptions.defaultMarkerColor;		
                    this._draw2DSegment_Marker(ctx, x.cache[ii], y.cache[ii], xg, xo, yg, yo);				
                }
            }
        }
    }			
}