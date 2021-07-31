/* global MutationObserver */

function HTMLMagnifier(options) {

  const _this = this;

  _this.options = Object.assign({ zoom: 2, shape: '50', width: 200, height: 200 }, options);

  const magnifierTemplate = `<div class="magnifier" style="display: none;position: fixed;overflow: hidden;background-color: #222222;border: 1px solid #555;border-radius: 4px;z-index:100;">
                               <div class="magnifier-content" style="top: 0px;left: 0px;margin-left: 0px;margin-top: 0px;overflow: visible;position: absolute;display: block;transform-origin: left top;-moz-transform-origin: left top;-ms-transform-origin: left top;-webkit-transform-origin: left top;-o-transform-origin: left top;user-select: none;-moz-user-select: none;-webkit-user-select: none;padding-top: 0px"></div>
                               <div class="magnifier-glass" style="position: absolute;top: 0px;left: 0px;width: 100%;height: 100%;opacity: 0.0;-ms-filter: alpha(opacity=0);background-color: white;"></div>
                             </div>`;

  const MutationObserver = window.MutationObserver || window.WebKitMutationObserver;

  let magnifier, magnifierContent;
  let observerObj;
  let syncTimeout;
  let isVisible = false;
  let magnifierBody;
  let events = {};

  function setPosition(element, left, top) {
    element.style.left = `${left}px`;
    element.style.top = `${top}px`;
  }

  function setDimensions(element, width, height) {
    element.style.width = `${width}px`;
    element.style.height = `${height}px`;
  }

  function setupMagnifier() {

      setDimensions(magnifier, _this.options.width, _this.options.height);
      magnifier.style.borderRadius = _this.options.shape+'%';

    magnifierContent.style.WebkitTransform =
      magnifierContent.style.MozTransform =
        magnifierContent.style.OTransform =
          magnifierContent.style.MsTransform =
            magnifierContent.style.transform = `scale(${_this.options.zoom})`;
  }

  function isDescendant(parent, child) {
    let node = child;
    while (node != null) {
      if (node == parent) {
        return true;
      }
      node = node.parentNode;
    }
    return false;
  }

  function syncContent() {
    if (isVisible) {
      prepareContent();
      syncViewport();
      syncScrollBars();
    }
  }

  function syncContentQueued() {
    if (isVisible) {
      window.clearTimeout(syncTimeout);
      syncTimeout = window.setTimeout(syncContent, 100);
    }
  }

  function domChanged() {
    if (isVisible) {
      syncContentQueued();
    }
  }

  function unBindDOMObserver() {
    if (observerObj) {
      observerObj.disconnect();
      observerObj = null;
    }
    if (document.removeEventListener) {
      document.removeEventListener('DOMNodeInserted', domChanged, false);
      document.removeEventListener('DOMNodeRemoved', domChanged, false);
    }
  }

  function bindDOMObserver() {
    if (MutationObserver) {
      observerObj = new MutationObserver(function(mutations, observer) {
        for(let i = 0; i < mutations.length; i++) {
          if (!isDescendant(magnifier, mutations[i].target)) {
            try {
              triggerEvent('checkMutation', mutations[i]);
              domChanged();
              break;
            } catch (error) {

            }
          }
        }
      });
      observerObj.observe(document, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: [
          'class',
          'width',
          'height',
          'style'
        ],
        attributeOldValue: true
      });
    } else
    if (document.addEventListener) {
      document.addEventListener('DOMNodeInserted', domChanged, false);
      document.addEventListener('DOMNodeRemoved', domChanged, false);
    }
  }

  function triggerEvent(event, data) {
    const handlers = events[event];
    if (handlers) {
      for(let i = 0; i < handlers.length; i++) {
        handlers[i].call(_this, data);
      }
    }
  }

  function syncViewport() {
    const x1 = magnifier.offsetLeft;
    const y1 = magnifier.offsetTop;
    const x2 = document.body.scrollLeft;
    const y2 = document.body.scrollTop;
    const left = -x1 * _this.options.zoom - x2 * _this.options.zoom;
    const top = -y1 * _this.options.zoom - y2 * _this.options.zoom;
    setPosition(magnifierContent, left, top);
    triggerEvent('viewPortChanged', magnifierBody);
  }

  function removeSelectors(container, selector) {
    const elements = container.querySelectorAll(selector);
    if (elements.length > 0) {
      for(let i = 0; i < elements.length; i++) {
        elements[i].parentNode.removeChild(elements[i]);
      }
    }
  }

  function prepareContent() {
    magnifierContent.innerHTML = '';
    const bodyOriginal = document.body;
    const bodyCopy = bodyOriginal.cloneNode(true);
    const color = bodyOriginal.style.backgroundColor;
    if (color) {
      magnifier.css('background-color', color);
    }
    bodyCopy.style.cursor = 'auto';
    bodyCopy.style.paddingTop = '0px';
    bodyCopy.setAttribute('unselectable', 'on');
    const canvasOriginal = bodyOriginal.querySelectorAll('canvas');
    const canvasCopy = bodyCopy.querySelectorAll('canvas');
    if (canvasOriginal.length > 0) {
      if (canvasOriginal.length === canvasCopy.length) {
        for(let i = 0; i < canvasOriginal.length; i++) {
          let ctx = canvasCopy[i].getContext('2d');
          ctx.drawImage(canvasOriginal[i], 0, 0);
        }
      }
    }
    removeSelectors(bodyCopy, 'script');
    removeSelectors(bodyCopy, 'audio');
    removeSelectors(bodyCopy, 'video');
    removeSelectors(bodyCopy, '.magnifier');
    triggerEvent('prepareContent', bodyCopy);
    magnifierContent.appendChild(bodyCopy);
    const width = document.body.clientWidth;
    const height = document.body.clientHeight;
    setDimensions(magnifierContent, width, height);
    magnifierBody = magnifierContent.querySelector('body');
    triggerEvent('contentUpdated', magnifierBody);
  }

  function initScrollBars() {
    triggerEvent('initScrollBars', magnifierBody);
  }

  function syncScroll(ctrl) {
    const selectors = [];
    if (ctrl.getAttribute) {
      if (ctrl.getAttribute('id')) {
        selectors.push('#' + ctrl.getAttribute('id'));
      }
      if (ctrl.className) {
        selectors.push('.' + ctrl.className.split(' ').join('.'));
      }
      for(let i = 0; i < selectors.length; i++) {
        let t = magnifierBody.querySelectorAll(selectors[i]);
        if (t.length == 1) {
          t[0].scrollTop  = ctrl.scrollTop;
          t[0].scrollLeft = ctrl.scrollLeft;
          return true;
        }
      }
    } else
    if (ctrl == document) {
      syncViewport();
    }
    return false;
  }

  function syncScrollBars(e) {
    if (isVisible) {
      if (e && e.target) {
        syncScroll(e.target);
      } else {
        let scrolled = [];
        let elements = document.querySelectorAll('div');
        for(let i = 0; i < elements.length; i++) {
          if (elements[i].scrollTop > 0) {
            scrolled.push(elements[i]);
          }
        }
        for(let i = 0; i < scrolled.length; i++) {
          if (!isDescendant(magnifier, scrolled[i])) {
            syncScroll(scrolled[i]);
          }
        }
      }
      triggerEvent('syncScrollBars', magnifierBody);
    }
  }

  function makeDraggable(ctrl, options) {

    const _this = this;

    let dragObject = null;
    let dragHandler = null;

    options = options || {};
    options.exclude = [ 'INPUT', 'TEXTAREA', 'SELECT', 'A', 'BUTTON' ];

    if (options.handler) {
      dragHandler = ctrl.querySelector(options.handler);
    } else {
      dragHandler = ctrl;
    }

    function setPosition(element, left, top) {
      element.style.left = `${left}px`;
      element.style.top = `${top}px`;
    }

    let drg_h, drg_w, pos_y, pos_x, ofs_x, ofs_y;

    ctrl.style.cursor = 'none';

    function downHandler(e) {
      ctrl.style.cursor = 'none';

      const target = e.target || e.srcElement;
      const parent = target.parentNode;

      if (target && (options.exclude.indexOf(target.tagName.toUpperCase()) == -1)) {
        if (!parent || (options.exclude.indexOf(parent.tagName.toUpperCase()) == -1)) {  // img in a
          dragObject = ctrl;

          const pageX = e.pageX || e.touches[0].pageX;
          const pageY = e.pageY || e.touches[0].pageY;

          ofs_x = dragObject.getBoundingClientRect().left - dragObject.offsetLeft;
          ofs_y = dragObject.getBoundingClientRect().top  - dragObject.offsetTop;

          pos_x = pageX - (dragObject.getBoundingClientRect().left + document.body.scrollLeft);
          pos_y = pageY - (dragObject.getBoundingClientRect().top  + document.body.scrollTop);

          e.preventDefault();
        }
      }
    }

    function moveHandler(e) {
      if (dragObject !== null) {
        const pageX = e.pageX || e.touches[0].pageX;
        const pageY = e.pageY || e.touches[0].pageY;
        const left = pageX - pos_x - ofs_x - document.body.scrollLeft;
        const top  = pageY - pos_y - ofs_y  - document.body.scrollTop;

        setPosition(dragObject, left, top);
        if (options.ondrag) {
          options.ondrag.call(e);
        }
      }
    }

    function upHandler(e) {
      if (dragObject !== null) {
        dragObject = null;
      }
      ctrl.style.cursor = 'default';
    

    }

    dragHandler.addEventListener('mousedown', function(e) {
      downHandler(e);
    });

    window.addEventListener('mousemove', function(e) {
      moveHandler(e);
    });

    window.addEventListener('dblclick', function(e) {
      upHandler(e);
    });

    dragHandler.addEventListener('touchstart', function(e) {
      downHandler(e);
    });

    window.addEventListener('touchmove', function(e) {
      moveHandler(e);
    });

    window.addEventListener('touchend', function(e) {
      upHandler(e);
    });

    return _this;

  }

  function init() {
    const div = document.createElement('div');
    div.innerHTML = magnifierTemplate;
    magnifier = div.querySelector('.magnifier');
    document.body.appendChild(magnifier);
    magnifierContent = magnifier.querySelector('.magnifier-content');
    if (window.addEventListener) {
      window.addEventListener('resize', syncContent, false);
      window.addEventListener('scroll', syncScrollBars, true);
    }
    makeDraggable(magnifier, { ondrag: syncViewport });
  }

  _this.setZoom = function(value) {
    _this.options.zoom = value;
    setupMagnifier();
  };

  _this.setShape = function(shape, width, height) {
    _this.options.shape = shape;
    if (width) {
      _this.options.width = width;
    }
    if (height) {
      _this.options.height = height;
    }
    setupMagnifier();
  };

  _this.setWidth = function(value) {
    _this.options.width = value;
    setupMagnifier();
  };

  _this.setHeight = function(value) {
    _this.options.height = value;
    setupMagnifier();
  };

  _this.getZoom = function() {
    return _this.options.zoom;
  };

  _this.getShape = function() {
    return _this.options.shape;
  };

  _this.getWidth = function() {
    return _this.options.width;
  };

  _this.getHeight = function() {
    return _this.options.height;
  };

  _this.isVisible = function() {
    return isVisible;
  };

  _this.on = function(event, callback) {
    events[event] = events[event] || [];
    events[event].push(callback);
  };

  _this.syncScrollBars = function(event) {
    syncScrollBars();
  };

  _this.syncContent = function(event) {
    syncContentQueued();
  };

  _this.hide = function(event) {
    unBindDOMObserver();
    magnifierContent.innerHTML = '';
    magnifier.style.display = 'none';
    isVisible = false;
  };

  _this.show = function(event) {
    let left, top;
    if (event) {
      left = event.pageX - 20;
      top = event.pageY - 20;
    } else {
      left = 200;
      top = 200;
    }
    setupMagnifier();
    prepareContent();
    setPosition(magnifier, left, top);
    magnifier.style.display = '';
    syncViewport();
    syncScrollBars();
    initScrollBars();
    bindDOMObserver();
    isVisible = true;
  };

  init();

  return _this;

}