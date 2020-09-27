/**
 * @brief   ggGraphs
 *
 * @author  Phil Braica  HoshiKata@aol.com
 *
 * @copyright 2020, Philip Braica, MIT License
 *
 */


/**
 * Reuse line series for heatmaps.
 */
class HeatmapSeries extends LineSeries {
    
    /**
     * @brief   Constructor.
     * 
     * @param   seriesOptions  Ex. {name: 'low', opacity: 0.5, period: 1000, minColor: 0, maxColor: 0.5}
     * @param   vGuid          Value guid.
     */
    constructor(seriesOptions, vGuid) {        
        super(seriesOptions, undefined, undefined, '', vGuid);        
    }
        
    /**
     * Draw a block of heatmap.
     *
     * @param 	ctx		Canvas context.
     * @param 	xData	X series data values array.
     * @param 	yData	Y series data values array.
     * @param 	xg 		X gain.
     * @param   xo		X offset.
     * @param 	yg 		Y gain.
     * @param   yo		Y offset.
     * @param   s_inv   Stride inverse.
     * @param   ymin    Y minimum.
     * @param   ymax    Y maximum.
     * @param   cg      Color gain
     * @param   co      Color offset.
     */
    _drawHeatmapBlock(ctx, xData, yData, xg, xo, yg, yo, s_inv, ymin, ymax, cg, co) {
        let len = xData.length < yData.length ? xData.length : yData.length;
        let cg = 1/(cmax - cmin);
        let stride = this.seriesOptions.period;
        for (let ii = 0; ii < len; ii++) {
            let xp = xData[ii];
            let color_value = yData[ii];
            let yp = xp * s_inv;
            yp = (yp - Math.floor(yp)) * stride;
            if (yp < ymin || yp > ymax) {
                continue;
            }
            ctx.fillStyle = valueToColor((color_value * cg) + co);
            ctx.fillRect(xp -1, yp -1, 2, 2);
        }            
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
        let xsg = layout.w / (dataBounds.xBounds.max - dataBounds.xBounds.min);
        let xso = -dataBounds.xBounds.min * xg + layout.x;
        let xfg = layout.h / (dataBounds.yBounds.max - dataBounds.yBounds.min);
        let xfo = -dataBounds.yBounds.min * yg + layout.y;
                
        let cacheLen = x.cache.length;
        
        // A heatmap has a "stride" which is how many "x" = 1 column.
        // The "bounds" are in units of data x-slow and x-fast.
        let stride = this.seriesOptions.period;
        let stride_inv = 1 / stride;
        
        let ymin = undefined;
        let ymax = undefined;
        
        for (let ii = 0; ii < cacheLen; ii++) {
            ymin = ymin < y.mins[ii] ? ymin : y.mins[ii];
            ymax = ymax > y.maxs[ii] ? ymax : y.maxs[ii];
        }
        
        // Map to minColor, maxColor.
        // minColor = cg*ymin + co
        // maxColor = cg*ymax + co
        // maxc-minc = cg(ymax-ymin)
        // cg = (maxc-minc)/(ymax-ymin)
        // co = minColor - cg*ymin
        let delta_c = this.seriesOptions.maxColor - this.seriesOptions.minColor;
        delta_c = (delta_c > 0) & (delta_c <= 1) ? delta_c : 1;
        let doff = 
        let cg = ymax > ymin ? delta_c / (ymax - ymin) : 1;
        let co = this.seriesOptions.minColor - (ymin * cg);
                
        for (let ii = 0; ii < cacheLen; ii++) {
            let xmin = x.mins[ii];
            let xmax = x.maxs[ii];
            
            if (xmin > dataBounds.xBounds.max || xmax < dataBounds.xBounds.min) {
                // Beyond the "fast" axis bounds
                continue;
            }
            
            // Slow is in slices.
            xmin = xmin * stride_inv;
            xmax = xmax * stride_inv;
            xmin = (xmin - Math.floor(xmin)) * stride;
            xmax = (xmax - Math.floor(xmax)) * stride;
            
            if (xmin > dataBounds.yBounds.max || xmax < dataBounds.yBounds.min) {
                // Beyond the "slow" axis bounds
                continue;
            }
            
            // Paint it.
            this._drawHeatmapBlock(ctx, x.cache[ii], y.cache[ii], 
                xsg, xso, xfg, xfo, stride_inv,
                dataBounds.yBounds.min, dataBounds.yBounds.max,
                cg, co);            
        }        
    }
}