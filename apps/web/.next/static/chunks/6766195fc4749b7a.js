(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,105218,e=>{"use strict";var t=e.i(76734),i=e.i(359022),o=(0,i.__name)((e,o,r,a)=>{e.attr("class",r);let{width:s,height:c,x:d,y:g}=n(e,o);(0,t.configureSvgSize)(e,c,s,a);let u=l(d,g,s,c,o);e.attr("viewBox",u),i.log.debug(`viewBox configured: ${u} with padding: ${o}`)},"setupViewPortForSVG"),n=(0,i.__name)((e,t)=>{let i=e.node()?.getBBox()||{width:0,height:0,x:0,y:0};return{width:i.width+2*t,height:i.height+2*t,x:i.x,y:i.y}},"calculateDimensionsWithPadding"),l=(0,i.__name)((e,t,i,o,n)=>`${e-n} ${t-n} ${i} ${o}`,"createViewBox");e.s(["setupViewPortForSVG",()=>o])},179618,e=>{"use strict";var t=e.i(359022);e.i(780269);var i=e.i(455845),o=(0,t.__name)((e,t)=>{let o;return"sandbox"===t&&(o=(0,i.select)("#i"+e)),("sandbox"===t?(0,i.select)(o.nodes()[0].contentDocument.body):(0,i.select)("body")).select(`[id="${e}"]`)},"getDiagramElement");e.s(["getDiagramElement",()=>o])},881613,e=>{"use strict";var t=(0,e.i(359022).__name)(()=>`
  /* Font Awesome icon styling - consolidated */
  .label-icon {
    display: inline-block;
    height: 1em;
    overflow: visible;
    vertical-align: -0.125em;
  }
  
  .node .label-icon path {
    fill: currentColor;
    stroke: revert;
    stroke-width: revert;
  }
`,"getIconStyles");e.s(["getIconStyles",()=>t])},942173,e=>{"use strict";var t=e.i(369093),i=e.i(476507);e.s(["channel",0,(e,o)=>t.default.lang.round(i.default.parse(e)[o])],942173)}]);