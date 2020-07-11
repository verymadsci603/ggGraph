/**
 * @brief   ggGraphs - DataSeries class
 *
 * @author  Phil Braica  HoshiKata@aol.com
 *
 * @copyright 2020, Philip Braica, MIT License
 *
 */
 
/**
 * @brief	An axis of data to manage.
 *
 * Data arrives to a DataSeries as an array,
 * to either set or append. The DataSeries can
 * be a set of arrays or just the one.
 *
 * An option would be a hierarchy of cached 
 * segments, for large data sets. That works well
 * on a Python / C++ application but poorly in 
 * Javascript. For that reason a simple 1-level
 * set of arrays for a modest amount (<100k total)
 * data is more useful. 
 *
 * This is meant for speed, and typical use cases.
 * <ul>
 * <li> Series often share a dependent (time-like) variable
 * so an indexGuid is provided to track how series are related 
 * for zoom, slice, and fetch like operations.
 */
class DataSeries {

    /** Constructor. */
    constructor(guid, indexGuid=undefined) {
        // guid         Everything is best by guid.
        // indexGuid    Index guid - if set the guid of the time-like series.
        // cache        array of arrays.
        // length       quick access to length of all data.
        // mins         Minimum for each array in cache.
        // maxs         Maximum for each array in cache.
        // lengths      Length in each cache array, for quick access.
        this.guid = guid;
        this.indexGuid = indexGuid;
        this.cache = [];
        this.length = 0;
        this.mins = [];
        this.maxs = [];
        this.lengths = [];        
	}
	
	/**
     * @brief   Push an array of data.
	 * 
     * @param   data    Array of data.
     */
	push(data) {
		this.cache.push(data);
		this.mins.push(Math.min(...data));
		this.maxs.push(Math.max(...data));
        this.lengths.push(data.length);
		this.length += data.length;        
	}
    
    /**
     * @brief   Dump all cache.
     */
	clear(){
		this.cache = [];
		this.mins = [];
		this.maxs = [];
        this.lengths = [];
		this.length = 0;
	}
    
    /**
     * @brief   Stream in new data, keep no more than max_size.
     * 
     * @param   data        New data array.
     * @param   max_size    Max amount points to keep.
     */
	stream(data, max_size) {
        this.push(data);
        let total = 0;
        let cache_len = this.cache.length;
        for (let ii = this.cache.length - 1; ii >= 0; ii--) {
            total += this.lengths[ii];
            if (total < max_size) {
                continue;
            }
            
            // the iith crosses over, so ii-1 isn't used to zero.
            if (ii > 0) {
                if (total === max_size) {
                    this.cache = this.cache.slice(ii);
                    this.mins = this.mins.slice(ii);
                    this.maxs = this.maxs.slice(ii);
                    this.lengths = this.lengths.slice(ii);
                    return;
                } else {
                    this.cache = this.cache.slice(ii - 1);
                    this.mins = this.mins.slice(ii - 1);
                    this.maxs = this.maxs.slice(ii - 1);
                    this.lengths = this.lengths.slice(ii - 1);
                }
            }
            // Either we cliped so the 0th is this was the zeroth.
            let remove = total - max_size;
            this.cache[0] = this.cache[0].slice(remove);
            this.mins[0] = Math.min(...(this.cache[0]));
            this.maxs[0] = Math.max(...(this.cache[0]));
            this.lengths[0] -= remove;
            
                
            break;
        }		
	}
    
    /**
     * @brief   Get the global minimum.
     * 
     * @return  Minimum value.
     */
	min() {
		return Math.min( ... this.mins);
	}
    
    /**
     * @brief   Get the global maximum.
     *
     * @return  Maximum value.
     */
	max() {
		return Math.max( ... this.maxs);
	}
    
    /**
     * @brief   Get the value at index.
     *
     * @param   index   Index to look for.
     */
    value(index) {
        
        if ((index > this.length) || (index < 0)) { return null; }
        
        // For loops aren't cool, but evaluate fast across most browsers.
        // @todo:
        // Bisecting would be an improvement, so would caching x, length
        // for repeated searches.
        let x = 0;
        let tll = this.lengths.length;
        for (let ii = 0; ii < tll; ii++) {
            let l_ii = this.lengths[ii];
            if (x + l_ii > index) {
                return this.cache[ii][index - x];
            }
            x += l_ii;                
        }
        return null;
    }
    
    /**
     * @brief   Return the next index matching min/max criteria.
     *
     * @param   index       Starting index to check.
     * @param   min         Minimum inclusive to look for.
     * @param   max         Maximum inclusive to look for.
     * @param   cacheInfo   Cache search info.
     * 
     * @returns structure of { index, offset, block}
     */
    nextIndex(index, min, max, cacheInfo) {
        let x = 0, b = 0, c = 0;
        if (cacheInfo !== undefined) {
            x = cacheInfo.offset;       // Index offset of the block.
            b = cacheInfo.block;        // Which cache block we just used.
        }
        
        let tll = this.lengths.length;
        
        // Advance the block to one with the index if needed.
        while (x + this.lengths[b] < index) {
            x += this.lengths[b];
            b++;
        }
        
        // Now search.
        for (let ii = b; ii < tll; ii++) {
            let c_len = this.lengths[ii];

            if ((this.mins[ii] >= min) && (this.maxs[ii] >= max)) {
                // Find within the ith cache, we may be mostly through
                // that block so, we may find nothing, this we stay
                // in the loop.
                // 
                // x is the start index of this block, if < index,
                // start at index - x
                let si = x < index ? index - x : 0;
                for (let jj = si; jj < c_len; jj++)  {
                    let v = this.cache[ii][jj];
                    if (v >= min && v <= max) {
                        return {
                            index: x + jj,
                            offset: x,
                            block: ii};
                    }
                }                            
            }
            x += c_len;
        }
    }

    /** 
     * @brief   Get a list of caches with some data in range.
     *
     * @param   min             Minimum value.
     * @param   max             Maximum value.
     * @param   allowedCaches   Allowed caches array, lowest to highest sorted.
     *
     * @return  Array of caches that have some data.
     */ 
    getCaches(min, max, allowedCaches = undefined) {
        let caches = [];
        if (allowedCaches === undefined) {  
            let c_len = this.cache.length;
            for (let ii = 0; ii < c_len; ii++) {
                if ((this.maxs[ii] >= min) && (this.mins[ii] <= max)) {
                    caches.push(ii);
                }
            }
        } else {
            let c_len = allowedCaches.length;
            for (let ii = 0; ii < c_len; ii++) {
                let jj = allowedCaches[ii];
                if ((this.maxs[jj] >= min) && (this.mins[jj] <= max)) {
                    caches.push(jj);
                }
            }
        }
        return caches;
    }
    
    filterIndexes(caches, min, max) {
        let indices = [];
        let c_len = caches.length;
        for (let ii = 0; ii < c_len; ii++) {
        }
    }
    
}
