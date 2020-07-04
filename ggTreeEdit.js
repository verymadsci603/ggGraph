/**
 * @brief   ggTreeEdit
 *
 * @author  Phil Braica  HoshiKata@aol.com
 *
 * @copyright 2020, Philip Braica, MIT License
 *
 */

/**
 * @brief   All registered object for changes.
 */
let ggTreeHive = {};

/**
 * @brief   JSON tree object editor.
 */
class ggTreeEdit {
    
    /**
     * @brief   Constructor.
     *
     * @param   obj     Takes an object.
     * @param   id      ID to track this.
     * @param   rules   Html rules.
     */
    constructor(obj, id, rules) {
        this.id = id;
        this.names = [];
        this.obj = obj;
        this.html = '';
        this.rules = rules;
        this.changed_callback = undefined;
        this._tree_create(obj, id, 0, undefined);
        if ((id !== null) && (id !== undefined)) {
            ggTreeHive[id] = this;
        }
    }
    
    remove() {
        if (this.id in ggTreeHive) {
            delete ggTreeHive[this.id];
        }
    }
    
    /**
     * @brief   Get the object we updated.
     *
     * @return  Object we're wrapping.
     */
    get_object() {
        return this.obj;
    }
    
    /**
     * @brief   Given an object tree, construct a '.' delimited list of sub-objects.
     *
     * @param   obj         Object to traverse.
     * @param   id          Object id.
     * @param   count       Indention.
     * @param   prefix      Prefix to use in the name.
     *
     * @return  Array of strings.
     */
    _tree_create(obj, id, count, prefix) {
        if ((obj === undefined) || (obj === null)) {
            return;
        }
        prefix = prefix === undefined ? '' : prefix;
        
        let k = Object.keys(obj); 
        let onclickstr = 
            'onclick=\"let isplus = this.textContent === \'+\';\n' + 
            '$(this).siblings(\'div\').css(\'display\', isplus? \'none\': \'block\');\n' +
            'this.textContent = isplus ? \'-\' : \'+\';\"';
        if (obj.constructor === Object) {
            if (count != 0) {
                this.html += '<div style="margin-left: 18px;"><div>' + 
                    '<button style="padding:0; margin: 0 4px 0 0; width:18px; height:18px" ' + onclickstr + '>+</button>' + prefix;
            } else {
                this.html +='<div>';
            }       
            for (let ii = 0; ii < k.length; ii++) {
                this._tree_create(
                    obj[k[ii]], 
                    id, 
                    count + 1, 
                    count == 0 ? k[ii] : prefix + '.' + k[ii]);
            }
            this.html += '</div></div>';
        } else {
            this.html += '<div style="margin-left: 22px;">' + prefix + ': ' + this._make_editor(prefix, obj, id) + '</div>';
            this.names.push(prefix);
        }
    }
    
    /**
     * @brief   Make an editor based on id matching rules.
     *
     * @param   item_id     ID name (to match against rules).
     * @param   value       The current value.
     * @param   obj_id      The object ID.
     */
    _make_editor(item_id, value, obj_id) {
        let eventHandler = 'onchange=\"ggTree_itemEdited(\'' + obj_id + '\', \'' + item_id + '\', this); \"';
        let eventHandler2 = '" ' + eventHandler + '>';;
        for (let ii = 0; ii < this.rules.length; ii++) {
            if (item_id.endsWith(this.rules[ii].k)) {
                if (this.rules[ii].v === 'color') {
                    // Split value into color and transparency.
                    // Value is #rrggbbaa where aa is optional opacity
                    let clr = value.substring(0, 7);
                    clr = clr !== '' ? clr : '#FFFFFF';
                    let tra = parseInt(value.length > 7 ? value.substring(7) : 'FF', 16);
                    
                    return '<input type="color" ' + 
                        'style="padding: 0px; border: 0px; background-color: transparent; vertical-align: middle;"' + 
                        ' value="' + clr + eventHandler2 + 
                        '<input style="width: 80px; vertical-align:middle; outline:none;" type="range" min="0" max="255" value="' + tra + eventHandler2;
                }
                if (this.rules[ii].v === 'number') {
                    return '<input type="number"  style="width:60px" value="' + value + eventHandler2;
                }
                if (this.rules[ii].v === 'percent') {
                    return '<input type="number"style="width:60px" min="0" max="100" value="' + value + eventHandler2;
                }
                if (this.rules[ii].v === 'text') {
                    return '<input type="text" style="max-width: 120px" value="' + value + eventHandler2;
                }
                if (this.rules[ii].v === 'show') {
                    return '<select class="gg_itemedit_showhide" ' + eventHandler + '><option>Show</option><option>Hide</option></select>';
                }
                if (this.rules[ii].v === 'bool') {
                    return '<select class="gg_itemedit_bool" ' + eventHandler + '><option>True</option><option>False</option></select>';
                }
                if (this.rules[ii].v.startsWith('select:')) {
                    let options = this.rules[ii].v.substring(7).split('|');
                    let rv = ''
                    for (let ii = 0; ii < options.length; ii++) {
                        rv += '<option>' + options[ii] + '</option>';
                    }
                    return '<select ' + eventHandler + '>' + rv + '</select>';
                }
            }
        }
        return value;
    }
        
    /**
     * @brief   Set a value in an object tree by key.
     *
     * @param   obj     Object.
     * @param   key     Key to use.
     * @param   value   Value.
     */
    set(key, value) {
        let obj = this.obj;
        let keys = key.split('.');
        let klen = keys.length;
        let klast = klen - 1;
        for (let ii = 0; ii < klen; ii++) {
            // Last one? set it.
            let k_ii = keys[ii];
            if (ii === klast) {
                let old_value = obj[k_ii];
                obj[k_ii] = value;
                if (this.changed_callback !== undefined) {
                    this.changed_callback(this, key, old_value, value);
                }
                return;
            }
            
            // Not the last one?
            let levelsKeys = Object.keys(obj);
            if (levelsKeys.includes(k_ii)) {
                obj = obj[k_ii];
            } else {
                obj[k_ii] = {};
            }
        }
    }
    
    /**
     * @brief   Set onchanged
     *
     * @param   func    Function, call signature: something(this, key, old_value, value);
     */
    onchange(func){
        this.changed_callback = func;
    }

    /**
     * @brief   Set a value in an object tree by key.
     *
     * @param   obj     Object.
     * @param   key     Key to use.
     *
     * @return  Value or undefined.
     */
    get(key) {
        let obj = this.obj;
        let keys = key.split('.');
        let klen = keys.length;
        let klast = klen - 1;
        for (let ii = 0; ii < klen; ii++) {
            // Last one? get it.
            let k_ii = keys[ii];
            if (ii === klast) {
                return obj[k_ii];
            }
            
            // Not the last one?
            let levelsKeys = Object.keys(obj);
            if (!levelsKeys.includes(k_ii)) {
                return undefined;
            }
            obj = obj[k_ii];            
        }
    }
}

/**
 * @brief   Called when an item is edited.
 *
 * @param   obj_id      Which object ID to lookup and change.
 * @param   item_id     Which item in the object, by path.
 * @param   that        HTML element firing the event.
 */
function ggTree_itemEdited(obj_id, item_id, that) {
    if (!(obj_id in ggTreeHive)) {
        // Old or not yet defined.
        return;
    }
    
    // Something to do...
    
    if (that.type === 'number') {
        ggTreeHive[obj_id].set(item_id, that.valueAsNumber);
        return;
    }

    // Things best w/ jquery ...
    let $tht = $(that);
    if ((that.type === 'color') || (that.type === 'range')) {
        let $sib = $tht.siblings('input');
        let tra = '';
        let clr = '';
        if (($sib.length > 0) && ($sib[0].type === 'range')) {
           tra = $sib[0].valueAsNumber.toString(16).toUpperCase(); 
           clr = that.value;
        }
        if (($sib.length > 0) && ($sib[0].type === 'color')) {
           clr = $sib[0].value;           
           tra = that.valueAsNumber.toString(16).toUpperCase(); 
        }
        tra = (tra === 'FF') ? '' : tra;
        ggTreeHive[obj_id].set(item_id, clr + tra);
        return;
    }
    
    if ($tht.hasClass('gg_itemedit_showhide')) {            
        ggTreeHive[obj_id].set(item_id, that.value === 'Show');
        return;
    }
    if ($tht.hasClass('gg_itemedit_bool')) {            
        ggTreeHive[obj_id].set(item_id, that.value === 'True');
        return;
    }
    ggTreeHive[obj_id].set(item_id, that.value);
}
