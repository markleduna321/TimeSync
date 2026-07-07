import{r as i,R as p}from"./app-cCeWdLAH.js";import{ax as F,ay as E,az as z,w as A,b as k,aA as B,Y as _}from"./index-CB6nBzoh.js";function O(e){var n;return(n=e==null?void 0:e.getRootNode)==null?void 0:n.call(e)}function U(e){return O(e)instanceof ShadowRoot}function K(e){return U(e)?O(e):null}function V(e){return e.replace(/-(.)/g,(n,o)=>o.toUpperCase())}function W(e,n){A(e,`[@ant-design/icons] ${n}`)}function v(e){return typeof e=="object"&&typeof e.name=="string"&&typeof e.theme=="string"&&(typeof e.icon=="object"||typeof e.icon=="function")}function x(e={}){return Object.keys(e).reduce((n,o)=>{const t=e[o];switch(o){case"class":n.className=t,delete n.class;break;default:delete n[o],n[V(o)]=t}return n},{})}function y(e,n,o){return o?p.createElement(e.tag,{key:n,...x(e.attrs),...o},(e.children||[]).map((t,a)=>y(t,`${n}-${e.tag}-${a}`))):p.createElement(e.tag,{key:n,...x(e.attrs)},(e.children||[]).map((t,a)=>y(t,`${n}-${e.tag}-${a}`)))}function $(e){return F(e)[0]}function I(e){return e?Array.isArray(e)?e:[e]:[]}const Z=`
.anticon {
  display: inline-flex;
  align-items: center;
  color: inherit;
  font-style: normal;
  line-height: 0;
  text-align: center;
  text-transform: none;
  vertical-align: -0.125em;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.anticon > * {
  line-height: 1;
}

.anticon svg {
  display: inline-block;
  vertical-align: inherit;
}

.anticon::before {
  display: none;
}

.anticon .anticon-icon {
  display: block;
}

.anticon[tabindex] {
  cursor: pointer;
}

.anticon-spin {
  -webkit-animation: loadingCircle 1s infinite linear;
  animation: loadingCircle 1s infinite linear;
}

@-webkit-keyframes loadingCircle {
  100% {
    -webkit-transform: rotate(360deg);
    transform: rotate(360deg);
  }
}

@keyframes loadingCircle {
  100% {
    -webkit-transform: rotate(360deg);
    transform: rotate(360deg);
  }
}
`,q=e=>{const{csp:n,prefixCls:o,layer:t}=i.useContext(E);let a=Z;o&&(a=a.replace(/anticon/g,o)),t&&(a=`@layer ${t} {
${a}
}`),i.useEffect(()=>{const r=e.current,c=K(r);z(a,"@ant-design-icons",{prepend:!t,csp:n,attachTo:c})},[])},f={primaryColor:"#333",secondaryColor:"#E6E6E6",calculated:!1};function G({primaryColor:e,secondaryColor:n}){f.primaryColor=e,f.secondaryColor=n||$(e),f.calculated=!!n}function X(){return{...f}}const d=e=>{const{icon:n,className:o,onClick:t,style:a,primaryColor:r,secondaryColor:c,...g}=e,m=i.useRef(null);let u=f;if(r&&(u={primaryColor:r,secondaryColor:c||$(r)}),q(m),W(v(n),`icon should be icon definiton, but got ${n}`),!v(n))return null;let s=n;return s&&typeof s.icon=="function"&&(s={...s,icon:s.icon(u.primaryColor,u.secondaryColor)}),y(s.icon,`svg-${s.name}`,{className:o,onClick:t,style:a,"data-icon":s.name,width:"1em",height:"1em",fill:"currentColor","aria-hidden":"true",...g,ref:m})};d.displayName="IconReact";d.getTwoToneColors=X;d.setTwoToneColors=G;function P(e){const[n,o]=I(e);return d.setTwoToneColors({primaryColor:n,secondaryColor:o})}function H(){const e=d.getTwoToneColors();return e.calculated?[e.primaryColor,e.secondaryColor]:e.primaryColor}function b(){return b=Object.assign?Object.assign.bind():function(e){for(var n=1;n<arguments.length;n++){var o=arguments[n];for(var t in o)Object.prototype.hasOwnProperty.call(o,t)&&(e[t]=o[t])}return e},b.apply(this,arguments)}P(B.primary);const C=i.forwardRef((e,n)=>{const{className:o,icon:t,spin:a,rotate:r,tabIndex:c,onClick:g,twoToneColor:m,...u}=e,{prefixCls:s="anticon",rootClassName:R}=i.useContext(E),D=k(R,s,{[`${s}-${t.name}`]:!!t.name,[`${s}-spin`]:!!a||t.name==="loading"},o);let h=c;h===void 0&&g&&(h=-1);const L=r?{msTransform:`rotate(${r}deg)`,transform:`rotate(${r}deg)`}:void 0,[N,j]=I(m);return i.createElement("span",b({role:"img","aria-label":t.name},u,{ref:n,tabIndex:h,onClick:g,className:D}),i.createElement(d,{icon:t,primaryColor:N,secondaryColor:j,style:L}))});C.getTwoToneColor=H;C.setTwoToneColor=P;var Y={icon:{tag:"svg",attrs:{"fill-rule":"evenodd",viewBox:"64 64 896 896",focusable:"false"},children:[{tag:"path",attrs:{d:"M512 64c247.4 0 448 200.6 448 448S759.4 960 512 960 64 759.4 64 512 264.6 64 512 64zm127.98 274.82h-.04l-.08.06L512 466.75 384.14 338.88c-.04-.05-.06-.06-.08-.06a.12.12 0 00-.07 0c-.03 0-.05.01-.09.05l-45.02 45.02a.2.2 0 00-.05.09.12.12 0 000 .07v.02a.27.27 0 00.06.06L466.75 512 338.88 639.86c-.05.04-.06.06-.06.08a.12.12 0 000 .07c0 .03.01.05.05.09l45.02 45.02a.2.2 0 00.09.05.12.12 0 00.07 0c.02 0 .04-.01.08-.05L512 557.25l127.86 127.87c.04.04.06.05.08.05a.12.12 0 00.07 0c.03 0 .05-.01.09-.05l45.02-45.02a.2.2 0 00.05-.09.12.12 0 000-.07v-.02a.27.27 0 00-.05-.06L557.25 512l127.87-127.86c.04-.04.05-.06.05-.08a.12.12 0 000-.07c0-.03-.01-.05-.05-.09l-45.02-45.02a.2.2 0 00-.09-.05.12.12 0 00-.07 0z"}}]},name:"close-circle",theme:"filled"};function w(){return w=Object.assign?Object.assign.bind():function(e){for(var n=1;n<arguments.length;n++){var o=arguments[n];for(var t in o)Object.prototype.hasOwnProperty.call(o,t)&&(e[t]=o[t])}return e},w.apply(this,arguments)}const J=(e,n)=>i.createElement(C,w({},e,{ref:n,icon:Y})),fe=i.forwardRef(J),Q=`accept acceptCharset accessKey action allowFullScreen allowTransparency
    alt async autoComplete autoFocus autoPlay capture cellPadding cellSpacing challenge
    charSet checked classID className colSpan cols content contentEditable contextMenu
    controls coords crossOrigin data dateTime default defer dir disabled download draggable
    encType form formAction formEncType formMethod formNoValidate formTarget frameBorder
    headers height hidden high href hrefLang htmlFor httpEquiv icon id inputMode integrity
    is keyParams keyType kind label lang list loop low manifest marginHeight marginWidth max maxLength media
    mediaGroup method min minLength multiple muted name noValidate nonce open
    optimum pattern placeholder poster preload radioGroup readOnly rel required
    reversed role rowSpan rows sandbox scope scoped scrolling seamless selected
    shape size sizes span spellCheck src srcDoc srcLang srcSet start step style
    summary tabIndex target title type useMap value width wmode wrap`,ee=`onCopy onCut onPaste onCompositionEnd onCompositionStart onCompositionUpdate onKeyDown
    onKeyPress onKeyUp onFocus onBlur onChange onInput onSubmit onClick onContextMenu onDoubleClick
    onDrag onDragEnd onDragEnter onDragExit onDragLeave onDragOver onDragStart onDrop onMouseDown
    onMouseEnter onMouseLeave onMouseMove onMouseOut onMouseOver onMouseUp onSelect onTouchCancel
    onTouchEnd onTouchMove onTouchStart onScroll onWheel onAbort onCanPlay onCanPlayThrough
    onDurationChange onEmptied onEncrypted onEnded onError onLoadedData onLoadedMetadata
    onLoadStart onPause onPlay onPlaying onProgress onRateChange onSeeked onSeeking onStalled onSuspend onTimeUpdate onVolumeChange onWaiting onLoad onError`,ne=`${Q} ${ee}`.split(/[\s\n]+/),oe="aria-",te="data-";function S(e,n){return e.indexOf(n)===0}function ge(e,n=!1){let o;n===!1?o={aria:!0,data:!0,attr:!0}:n===!0?o={aria:!0}:o={...n};const t={};return Object.keys(e).forEach(a=>{(o.aria&&(a==="role"||S(a,oe))||o.data&&S(a,te)||o.attr&&ne.includes(a))&&(t[a]=e[a])}),t}const ae=p.createContext(void 0),l=100,re=10,me=l*re,M={Modal:l,Drawer:l,Popover:l,Popconfirm:l,Tooltip:l,Tour:l,FloatButton:l},se={SelectLike:50,Dropdown:50,DatePicker:50,Menu:50,ImagePreview:1},ie=e=>e in M,pe=(e,n)=>{const[,o]=_(),t=p.useContext(ae),a=ie(e);let r;if(n!==void 0)r=[n,n];else{let c=t??0;a?c+=(t?0:o.zIndexPopupBase)+M[e]:c+=se[e],r=[t===void 0?n:c,c]}return r},Ce=e=>`${e}-css-var`;var ce={icon:{tag:"svg",attrs:{viewBox:"0 0 1024 1024",focusable:"false"},children:[{tag:"path",attrs:{d:"M988 548c-19.9 0-36-16.1-36-36 0-59.4-11.6-117-34.6-171.3a440.45 440.45 0 00-94.3-139.9 437.71 437.71 0 00-139.9-94.3C629 83.6 571.4 72 512 72c-19.9 0-36-16.1-36-36s16.1-36 36-36c69.1 0 136.2 13.5 199.3 40.3C772.3 66 827 103 874 150c47 47 83.9 101.8 109.7 162.7 26.7 63.1 40.2 130.2 40.2 199.3.1 19.9-16 36-35.9 36z"}}]},name:"loading",theme:"outlined"};function T(){return T=Object.assign?Object.assign.bind():function(e){for(var n=1;n<arguments.length;n++){var o=arguments[n];for(var t in o)Object.prototype.hasOwnProperty.call(o,t)&&(e[t]=o[t])}return e},T.apply(this,arguments)}const le=(e,n)=>i.createElement(C,T({},e,{ref:n,icon:ce})),he=i.forwardRef(le);export{me as C,C as I,he as R,ae as Z,fe as a,pe as b,K as g,ge as p,Ce as u};
