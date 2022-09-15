(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.SimbridgeClient = {}));
})(this, (function (exports) { 'use strict';

  function _defineProperty(obj, key, value) {
    if (key in obj) {
      Object.defineProperty(obj, key, {
        value: value,
        enumerable: true,
        configurable: true,
        writable: true
      });
    } else {
      obj[key] = value;
    }

    return obj;
  }

  /**
   * Allows interacting with the persistent storage
   */
  class NXDataStore {
    static get listener() {
      if (this.mListener === undefined) {
        this.mListener = RegisterViewListener('JS_LISTENER_SIMVARS', null, true);
      }

      return this.mListener;
    }
    /**
     * Reads a value from persistent storage
     * @param key The property key
     * @param defaultVal The default value if the property is not set
     */


    static get(key, defaultVal) {
      const val = GetStoredData("A32NX_".concat(key)); // GetStoredData returns null on error, or empty string for keys that don't exist (why isn't that an error??)
      // We could use SearchStoredData, but that spams the console with every key (somebody left their debug print in)

      if (val === null || val.length === 0) {
        return defaultVal;
      }

      return val;
    }
    /**
     * Sets a value in persistent storage
     *
     * @param key The property key
     * @param val The value to assign to the property
     */


    static set(key, val) {
      SetStoredData("A32NX_".concat(key), val);
      this.listener.triggerToAllSubscribers('A32NX_NXDATASTORE_UPDATE', key, val);
    }

    static subscribe(key, callback) {
      return Coherent.on('A32NX_NXDATASTORE_UPDATE', (updatedKey, value) => {
        if (key === '*' || key === updatedKey) {
          callback(updatedKey, value);
        }
      }).clear;
    }

    static getAndSubscribe(key, callback, defaultVal) {
      callback(key, NXDataStore.get(key, defaultVal));
      return NXDataStore.subscribe(key, callback);
    }

  }

  _defineProperty(NXDataStore, "mListener", void 0);

  const simbridgeUrl = "http://localhost:".concat(NXDataStore.get('CONFIG_SIMBRIDGE_PORT', '8380'));

  class Terrain {
    static async mapdataAvailable() {
      return fetch("".concat(simbridgeUrl, "/api/v1/terrain/available")).then(response => {
        Terrain.endpointsAvailable = response.ok;
        return response.ok;
      }).catch(_ex => {
        Terrain.endpointsAvailable = false;
        return false;
      });
    }

    static async setCurrentPosition(latitude, longitude, heading, altitude, verticalSpeed) {
      if (Terrain.endpointsAvailable) {
        fetch("".concat(simbridgeUrl, "/api/v1/terrain/position"), {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            latitude,
            longitude,
            heading,
            altitude,
            verticalSpeed
          })
        });
      } else {
        throw new Error('Endpoints unavailable');
      }
    }

    static async setDisplaySettings(side, settings) {
      if (Terrain.endpointsAvailable) {
        fetch("".concat(simbridgeUrl, "/api/v1/terrain/displaysettings?display=").concat(side), {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(settings)
        });
      } else {
        throw new Error('Endpoints unavailable');
      }
    }

    static async ndMapAvailable(side, timestamp) {
      if (Terrain.endpointsAvailable) {
        return fetch("".concat(simbridgeUrl, "/api/v1/terrain/ndMapAvailable?display=").concat(side, "&timestamp=").concat(timestamp)).then(response => {
          if (response.ok) {
            return response.text().then(text => text === 'true');
          }

          return false;
        });
      }

      throw new Error('Endpoints unavailable');
    }

    static async ndTransitionMaps(side, timestamp) {
      if (Terrain.endpointsAvailable) {
        return fetch("".concat(simbridgeUrl, "/api/v1/terrain/ndmaps?display=").concat(side, "&timestamp=").concat(timestamp), {
          method: 'GET',
          headers: {
            Accept: 'application/json'
          }
        }).then(response => response.json().then(imageBase64 => imageBase64));
      }

      throw new Error('Endpoints unavailable');
    }

    static async ndTerrainRange(side, timestamp) {
      if (Terrain.endpointsAvailable) {
        return fetch("".concat(simbridgeUrl, "/api/v1/terrain/terrainRange?display=").concat(side, "&timestamp=").concat(timestamp), {
          method: 'GET',
          headers: {
            Accept: 'application/json'
          }
        }).then(response => response.json().then(data => data));
      }

      throw new Error('Endpoints unavailable');
    }

    static async renderNdMap(side) {
      if (Terrain.endpointsAvailable) {
        return fetch("".concat(simbridgeUrl, "/api/v1/terrain/renderMap?display=").concat(side)).then(response => response.text().then(text => parseInt(text)));
      }

      throw new Error('Endpoints unavailable');
    }

  }

  _defineProperty(Terrain, "endpointsAvailable", false);

  /**
   * Class responsible for retrieving data related to company routes from SimBridge
   */
  class CompanyRoute {
    /**
     * Used to retrieve a given company route
     * @param route The routename in question
     * @returns Returns the CoRoute DTO
     */
    static async getCoRoute(route) {
      if (route) {
        const response = await fetch("".concat(simbridgeUrl, "/api/v1/coroute?rteNum=").concat(route));

        if (response.status === 200) {
          response.json();
        }

        throw new Error('Server Error');
      }

      throw new Error('No Company route provided');
    }
    /**
     * Used to retrieve a list of company routes for a given origin and dest
     * @param origin the origin
     * @param dest the destination
     * @returns Returns a list of CoRoute DTOs
     */


    static async getRouteList(origin, dest) {
      if (origin || dest) {
        const response = await fetch("".concat(simbridgeUrl, "/api/v1/coroute/list?origin=").concat(origin, "&destination=").concat(dest));

        if (response.ok) {
          response.json();
        }

        throw new Error('Server Error');
      }

      throw new Error('Origin or Destination missing');
    }

  }

  /**
   * Class pertaining to retrieving static files for general viewing from SimBridge
   */

  class Viewer {
    /**
     * Used to retrieve a streamable image of specified page within a given PDF file
     * @param filename required field, filename of the pdf
     * @param pageNumber required field, The page of the PDF file
     * @returns a Blob
     */
    static async getPDFPage(filename, pageNumber) {
      if (filename || pageNumber) {
        const response = await fetch("".concat(simbridgeUrl, "/api/v1/utility/pdf?filename=").concat(filename, "&pagenumber=").concat(pageNumber));

        if (response.ok) {
          return response.blob();
        }

        throw new Error("SimBridge Error: ".concat(response.status));
      }

      throw new Error('File name or page number missing');
    }
    /**
     * Retrieve the number of pages within a specified PDF file
     * @param filename required field, filename of the pdf
     * @returns A number
     */


    static async getPDFPageNum(filename) {
      if (filename) {
        const response = await fetch("".concat(simbridgeUrl, "/api/v1/utility/pdf/numpages?filename=").concat(filename));

        if (response.ok) {
          return response.json();
        }

        throw new Error("SimBridge Error: ".concat(response.status));
      }

      throw new Error('File name or page number missing');
    }
    /**
     * Used to retrieve a list of filenames within the PDF folder
     * @returns an Array of strings
     */


    static async getPDFList() {
      const response = await fetch("".concat(simbridgeUrl, "/api/v1/utility/pdf/list"));

      if (response.ok) {
        return response.json();
      }

      throw new Error("SimBridge Error: ".concat(response.status));
    }
    /**
     * Used to retrieve a streamable image of a specified image in the images folder
     * @param filename required field, filename of the image
     * @returns A Blob
     */


    static async getImage(filename, pageNumber) {
      if (filename || pageNumber) {
        const response = await fetch("".concat(simbridgeUrl, "/api/v1/utility/image?filename=").concat(filename));

        if (response.ok) {
          return response.blob();
        }

        throw new Error("SimBridge Error: ".concat(response.status));
      }

      throw new Error('File name or page number missing');
    }
    /**
     * Used to retrieve a list of filenames within the PDF folder
     * @returns an Array of strings
     */


    static async getImageList() {
      const response = await fetch("".concat(simbridgeUrl, "/api/v1/utility/image/list"));

      if (response.ok) {
        return response.json();
      }

      throw new Error("SimBridge Error: ".concat(response.status));
    }

  }

  exports.CompanyRoute = CompanyRoute;
  exports.Terrain = Terrain;
  exports.Viewer = Viewer;

  Object.defineProperty(exports, '__esModule', { value: true });

}));
