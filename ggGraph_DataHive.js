/**
 * @brief   ggGraphs - DataHive class
 *
 * @author  Phil Braica  HoshiKata@aol.com
 *
 * @copyright 2020, Philip Braica, MIT License
 *
 */

/**
 * @brief   Manages the data, memory, and data association.
 *
 * Most graphs are an "x" and a "y" variable where "x" is
 * the independent, and y is the dependent, like a time 
 * series. For this reason there may be many "y" lines 
 * associated with the same "x". There are also color, value
 * and 3D associations as well, so this is a general concept
 * of many kinds of graphs.
 *
 * The association, and flexibility of it means
 * you ideally want to fetch, manage, control and graph 
 * by having a "graph" API talk to a unified "data" API.
 *
 * Note that unassociated sets of data could still  
 * have separate DataHives to manage them for 
 * efficiency if that's desired.
 */
class DataHive {
    
    /** Constructor. */
    constructor() {
        self.seriesMap = [];
    }
    
    /** 
     * @brief   Add (or if it exists replace) a data series.
     * 
     * @param   dataSeries  The series to add/replace.
     */
    add_dataSeries(dataSeries){
        for (let ii = 0; ii < self.seriesMap.length; ii++) {
            if (self.seriesMap[ii].guid === dataSeries.guid) {
                self.seriesMap[ii] = dataSeries;
                return;
            }
        }
        self.seriesMap.push(dataSeries);
    }
    
    /**
     * @brief   By GUID find and return the series object.
     *
     * @param   guid    GUID to search for.
     *
     * @return  DataSource class instance.
     */
    get_dataSeries(guid) {
        for (let ii = 0; ii < self.seriesMap.length; ii++) {
            if (self.seriesMap[ii].guid === guid) {
                return self.seriesMap[ii];
            }
        }
        return null;
    }
    
    /**
     * @brief   Remove / delete a DataSeries from the Hive.
     * 
     * @param   guid    GUID to search for.
     */
    del_dataSeries(guid) {
        for (let ii = 0; ii < self.seriesMap.length; ii++) {
            if (self.seriesMap[ii].guid === guid) {
                self.seriesMap.splice(ii, 1);
                return;
            }
        }
    }
    
    /**
     * @brief   Get the min of a series.
     *
     * @param   guid    GUID to search for.
     *
     * @return  Minimum or null.
     */
    min(guid) {
        for (let ii = 0; ii < self.seriesMap.length; ii++) {
            if (self.seriesMap[ii].guid === guid) {
                return self.seriesMap[ii].min();
            }
        }
        return null;
    }
    
    /**
     * @brief   Get the max of a series.
     *
     * @param   guid    GUID to search for.
     *
     * @return  Maximum or null.
     */
    max(guid) {
        for (let ii = 0; ii < self.seriesMap.length; ii++) {
            if (self.seriesMap[ii].guid === guid) {
                return self.seriesMap[ii].max();
            }
        }
        return null;
    }
    
    get_dataSeriesBounded(boundGuids, bounds, unboundGuids, num_points) {
        bd = boundGuids.reduce((accum, guid) => { return accum.append(get_dataSeries[guid]);});
        ud = unboundGuids.reduce((accum, guid) => { return accum.append(get_dataSeries[guid]);});
        segments = [];
        
        // Do by tree hierarchically later.
        let max_bd = bd.reduce((min, el, ii) => { return ii == 0 ? el.length : min < el.length ? min : el.length; });
        let max_ud = bd.reduce((min, el, ii) => { return ii == 0 ? el.length : min < el.length ? min : el.length; });
    }
}