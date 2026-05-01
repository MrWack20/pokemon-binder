(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,13786,(e,t,i)=>{"use strict";Object.defineProperty(i,"__esModule",{value:!0}),Object.defineProperty(i,"warnOnce",{enumerable:!0,get:function(){return r}});let r=e=>{}},83460,(e,t,i)=>{"use strict";Object.defineProperty(i,"__esModule",{value:!0});var r={DecodeError:function(){return g},MiddlewareNotFoundError:function(){return w},MissingStaticPage:function(){return x},NormalizeError:function(){return b},PageNotFoundError:function(){return v},SP:function(){return m},ST:function(){return y},WEB_VITALS:function(){return a},execOnce:function(){return n},getDisplayName:function(){return d},getLocationOrigin:function(){return l},getURL:function(){return c},isAbsoluteUrl:function(){return u},isResSent:function(){return h},loadGetInitialProps:function(){return p},normalizeRepeatedSlashes:function(){return f},stringifyError:function(){return C}};for(var s in r)Object.defineProperty(i,s,{enumerable:!0,get:r[s]});let a=["CLS","FCP","FID","INP","LCP","TTFB"];function n(e){let t,i=!1;return(...r)=>(i||(i=!0,t=e(...r)),t)}let o=/^[a-zA-Z][a-zA-Z\d+\-.]*?:/,u=e=>o.test(e);function l(){let{protocol:e,hostname:t,port:i}=window.location;return`${e}//${t}${i?":"+i:""}`}function c(){let{href:e}=window.location,t=l();return e.substring(t.length)}function d(e){return"string"==typeof e?e:e.displayName||e.name||"Unknown"}function h(e){return e.finished||e.headersSent}function f(e){let t=e.split("?");return t[0].replace(/\\/g,"/").replace(/\/\/+/g,"/")+(t[1]?`?${t.slice(1).join("?")}`:"")}async function p(e,t){let i=t.res||t.ctx&&t.ctx.res;if(!e.getInitialProps)return t.ctx&&t.Component?{pageProps:await p(t.Component,t.ctx)}:{};let r=await e.getInitialProps(t);if(i&&h(i))return r;if(!r)throw Object.defineProperty(Error(`"${d(e)}.getInitialProps()" should resolve to an object. But found "${r}" instead.`),"__NEXT_ERROR_CODE",{value:"E1025",enumerable:!1,configurable:!0});return r}let m="u">typeof performance,y=m&&["mark","measure","getEntriesByName"].every(e=>"function"==typeof performance[e]);class g extends Error{}class b extends Error{}class v extends Error{constructor(e){super(),this.code="ENOENT",this.name="PageNotFoundError",this.message=`Cannot find module for page: ${e}`}}class x extends Error{constructor(e,t){super(),this.message=`Failed to load static file for page: ${e} ${t}`}}class w extends Error{constructor(){super(),this.code="ENOENT",this.message="Cannot find the middleware module"}}function C(e){return JSON.stringify({message:e.message,stack:e.stack})}},31301,(e,t,i)=>{"use strict";Object.defineProperty(i,"__esModule",{value:!0});var r={assign:function(){return u},searchParamsToUrlQuery:function(){return a},urlQueryToSearchParams:function(){return o}};for(var s in r)Object.defineProperty(i,s,{enumerable:!0,get:r[s]});function a(e){let t={};for(let[i,r]of e.entries()){let e=t[i];void 0===e?t[i]=r:Array.isArray(e)?e.push(r):t[i]=[e,r]}return t}function n(e){return"string"==typeof e?e:("number"!=typeof e||isNaN(e))&&"boolean"!=typeof e?"":String(e)}function o(e){let t=new URLSearchParams;for(let[i,r]of Object.entries(e))if(Array.isArray(r))for(let e of r)t.append(i,n(e));else t.set(i,n(r));return t}function u(e,...t){for(let i of t){for(let t of i.keys())e.delete(t);for(let[t,r]of i.entries())e.append(t,r)}return e}},27910,e=>{"use strict";var t=e.i(89432),i=e.i(49913),r=e.i(56813),s=class extends i.Removable{#e;#t;#i;#r;constructor(e){super(),this.#e=e.client,this.mutationId=e.mutationId,this.#i=e.mutationCache,this.#t=[],this.state=e.state||a(),this.setOptions(e.options),this.scheduleGc()}setOptions(e){this.options=e,this.updateGcTime(this.options.gcTime)}get meta(){return this.options.meta}addObserver(e){this.#t.includes(e)||(this.#t.push(e),this.clearGcTimeout(),this.#i.notify({type:"observerAdded",mutation:this,observer:e}))}removeObserver(e){this.#t=this.#t.filter(t=>t!==e),this.scheduleGc(),this.#i.notify({type:"observerRemoved",mutation:this,observer:e})}optionalRemove(){this.#t.length||("pending"===this.state.status?this.scheduleGc():this.#i.remove(this))}continue(){return this.#r?.continue()??this.execute(this.state.variables)}async execute(e){let t=()=>{this.#s({type:"continue"})},i={client:this.#e,meta:this.options.meta,mutationKey:this.options.mutationKey};this.#r=(0,r.createRetryer)({fn:()=>this.options.mutationFn?this.options.mutationFn(e,i):Promise.reject(Error("No mutationFn found")),onFail:(e,t)=>{this.#s({type:"failed",failureCount:e,error:t})},onPause:()=>{this.#s({type:"pause"})},onContinue:t,retry:this.options.retry??0,retryDelay:this.options.retryDelay,networkMode:this.options.networkMode,canRun:()=>this.#i.canRun(this)});let s="pending"===this.state.status,a=!this.#r.canStart();try{if(s)t();else{this.#s({type:"pending",variables:e,isPaused:a}),this.#i.config.onMutate&&await this.#i.config.onMutate(e,this,i);let t=await this.options.onMutate?.(e,i);t!==this.state.context&&this.#s({type:"pending",context:t,variables:e,isPaused:a})}let r=await this.#r.start();return await this.#i.config.onSuccess?.(r,e,this.state.context,this,i),await this.options.onSuccess?.(r,e,this.state.context,i),await this.#i.config.onSettled?.(r,null,this.state.variables,this.state.context,this,i),await this.options.onSettled?.(r,null,e,this.state.context,i),this.#s({type:"success",data:r}),r}catch(t){try{await this.#i.config.onError?.(t,e,this.state.context,this,i)}catch(e){Promise.reject(e)}try{await this.options.onError?.(t,e,this.state.context,i)}catch(e){Promise.reject(e)}try{await this.#i.config.onSettled?.(void 0,t,this.state.variables,this.state.context,this,i)}catch(e){Promise.reject(e)}try{await this.options.onSettled?.(void 0,t,e,this.state.context,i)}catch(e){Promise.reject(e)}throw this.#s({type:"error",error:t}),t}finally{this.#i.runNext(this)}}#s(e){this.state=(t=>{switch(e.type){case"failed":return{...t,failureCount:e.failureCount,failureReason:e.error};case"pause":return{...t,isPaused:!0};case"continue":return{...t,isPaused:!1};case"pending":return{...t,context:e.context,data:void 0,failureCount:0,failureReason:null,error:null,isPaused:e.isPaused,status:"pending",variables:e.variables,submittedAt:Date.now()};case"success":return{...t,data:e.data,failureCount:0,failureReason:null,error:null,status:"success",isPaused:!1};case"error":return{...t,data:void 0,error:e.error,failureCount:t.failureCount+1,failureReason:e.error,isPaused:!1,status:"error"}}})(this.state),t.notifyManager.batch(()=>{this.#t.forEach(t=>{t.onMutationUpdate(e)}),this.#i.notify({mutation:this,type:"updated",action:e})})}};function a(){return{context:void 0,data:void 0,error:null,failureCount:0,failureReason:null,isPaused:!1,status:"idle",variables:void 0,submittedAt:0}}e.s(["Mutation",0,s,"getDefaultState",0,a])},33260,e=>{"use strict";let t,i;var r,s=e.i(99374);let a={data:""},n=/(?:([\u0080-\uFFFF\w-%@]+) *:? *([^{;]+?);|([^;}{]*?) *{)|(}\s*)/g,o=/\/\*[^]*?\*\/|  +/g,u=/\n+/g,l=(e,t)=>{let i="",r="",s="";for(let a in e){let n=e[a];"@"==a[0]?"i"==a[1]?i=a+" "+n+";":r+="f"==a[1]?l(n,a):a+"{"+l(n,"k"==a[1]?"":t)+"}":"object"==typeof n?r+=l(n,t?t.replace(/([^,])+/g,e=>a.replace(/([^,]*:\S+\([^)]*\))|([^,])+/g,t=>/&/.test(t)?t.replace(/&/g,e):e?e+" "+t:t)):a):null!=n&&(a=/^--/.test(a)?a:a.replace(/[A-Z]/g,"-$&").toLowerCase(),s+=l.p?l.p(a,n):a+":"+n+";")}return i+(t&&s?t+"{"+s+"}":s)+r},c={},d=e=>{if("object"==typeof e){let t="";for(let i in e)t+=i+d(e[i]);return t}return e};function h(e){let t,i,r=this||{},s=e.call?e(r.p):e;return((e,t,i,r,s)=>{var a;let h=d(e),f=c[h]||(c[h]=(e=>{let t=0,i=11;for(;t<e.length;)i=101*i+e.charCodeAt(t++)>>>0;return"go"+i})(h));if(!c[f]){let t=h!==e?e:(e=>{let t,i,r=[{}];for(;t=n.exec(e.replace(o,""));)t[4]?r.shift():t[3]?(i=t[3].replace(u," ").trim(),r.unshift(r[0][i]=r[0][i]||{})):r[0][t[1]]=t[2].replace(u," ").trim();return r[0]})(e);c[f]=l(s?{["@keyframes "+f]:t}:t,i?"":"."+f)}let p=i&&c.g?c.g:null;return i&&(c.g=c[f]),a=c[f],p?t.data=t.data.replace(p,a):-1===t.data.indexOf(a)&&(t.data=r?a+t.data:t.data+a),f})(s.unshift?s.raw?(t=[].slice.call(arguments,1),i=r.p,s.reduce((e,r,s)=>{let a=t[s];if(a&&a.call){let e=a(i),t=e&&e.props&&e.props.className||/^go/.test(e)&&e;a=t?"."+t:e&&"object"==typeof e?e.props?"":l(e,""):!1===e?"":e}return e+r+(null==a?"":a)},"")):s.reduce((e,t)=>Object.assign(e,t&&t.call?t(r.p):t),{}):s,(e=>{if("object"==typeof window){let t=(e?e.querySelector("#_goober"):window._goober)||Object.assign(document.createElement("style"),{innerHTML:" ",id:"_goober"});return t.nonce=window.__nonce__,t.parentNode||(e||document.head).appendChild(t),t.firstChild}return e||a})(r.target),r.g,r.o,r.k)}h.bind({g:1});let f,p,m,y=h.bind({k:1});function g(e,t){let i=this||{};return function(){let r=arguments;function s(a,n){let o=Object.assign({},a),u=o.className||s.className;i.p=Object.assign({theme:p&&p()},o),i.o=/ *go\d+/.test(u),o.className=h.apply(i,r)+(u?" "+u:""),t&&(o.ref=n);let l=e;return e[0]&&(l=o.as||e,delete o.as),m&&l[0]&&m(o),f(l,o)}return t?t(s):s}}var b=(e,t)=>"function"==typeof e?e(t):e,v=(t=0,()=>(++t).toString()),x=()=>{if(void 0===i&&"u">typeof window){let e=matchMedia("(prefers-reduced-motion: reduce)");i=!e||e.matches}return i},w="default",C=(e,t)=>{let{toastLimit:i}=e.settings;switch(t.type){case 0:return{...e,toasts:[t.toast,...e.toasts].slice(0,i)};case 1:return{...e,toasts:e.toasts.map(e=>e.id===t.toast.id?{...e,...t.toast}:e)};case 2:let{toast:r}=t;return C(e,{type:+!!e.toasts.find(e=>e.id===r.id),toast:r});case 3:let{toastId:s}=t;return{...e,toasts:e.toasts.map(e=>e.id===s||void 0===s?{...e,dismissed:!0,visible:!1}:e)};case 4:return void 0===t.toastId?{...e,toasts:[]}:{...e,toasts:e.toasts.filter(e=>e.id!==t.toastId)};case 5:return{...e,pausedAt:t.time};case 6:let a=t.time-(e.pausedAt||0);return{...e,pausedAt:void 0,toasts:e.toasts.map(e=>({...e,pauseDuration:e.pauseDuration+a}))}}},O=[],P={toasts:[],pausedAt:void 0,settings:{toastLimit:20}},E={},M=(e,t=w)=>{E[t]=C(E[t]||P,e),O.forEach(([e,i])=>{e===t&&i(E[t])})},q=e=>Object.keys(E).forEach(t=>M(e,t)),D=(e=w)=>t=>{M(t,e)},A={blank:4e3,error:4e3,success:2e3,loading:1/0,custom:4e3},Q=e=>(t,i)=>{let r,s=((e,t="blank",i)=>({createdAt:Date.now(),visible:!0,dismissed:!1,type:t,ariaProps:{role:"status","aria-live":"polite"},message:e,pauseDuration:0,...i,id:(null==i?void 0:i.id)||v()}))(t,e,i);return D(s.toasterId||(r=s.id,Object.keys(E).find(e=>E[e].toasts.some(e=>e.id===r))))({type:2,toast:s}),s.id},S=(e,t)=>Q("blank")(e,t);S.error=Q("error"),S.success=Q("success"),S.loading=Q("loading"),S.custom=Q("custom"),S.dismiss=(e,t)=>{let i={type:3,toastId:e};t?D(t)(i):q(i)},S.dismissAll=e=>S.dismiss(void 0,e),S.remove=(e,t)=>{let i={type:4,toastId:e};t?D(t)(i):q(i)},S.removeAll=e=>S.remove(void 0,e),S.promise=(e,t,i)=>{let r=S.loading(t.loading,{...i,...null==i?void 0:i.loading});return"function"==typeof e&&(e=e()),e.then(e=>{let s=t.success?b(t.success,e):void 0;return s?S.success(s,{id:r,...i,...null==i?void 0:i.success}):S.dismiss(r),e}).catch(e=>{let s=t.error?b(t.error,e):void 0;s?S.error(s,{id:r,...i,...null==i?void 0:i.error}):S.dismiss(r)}),e};var T=1e3,j=y`
from {
  transform: scale(0) rotate(45deg);
	opacity: 0;
}
to {
 transform: scale(1) rotate(45deg);
  opacity: 1;
}`,k=y`
from {
  transform: scale(0);
  opacity: 0;
}
to {
  transform: scale(1);
  opacity: 1;
}`,N=y`
from {
  transform: scale(0) rotate(90deg);
	opacity: 0;
}
to {
  transform: scale(1) rotate(90deg);
	opacity: 1;
}`,R=g("div")`
  width: 20px;
  opacity: 0;
  height: 20px;
  border-radius: 10px;
  background: ${e=>e.primary||"#ff4b4b"};
  position: relative;
  transform: rotate(45deg);

  animation: ${j} 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
  animation-delay: 100ms;

  &:after,
  &:before {
    content: '';
    animation: ${k} 0.15s ease-out forwards;
    animation-delay: 150ms;
    position: absolute;
    border-radius: 3px;
    opacity: 0;
    background: ${e=>e.secondary||"#fff"};
    bottom: 9px;
    left: 4px;
    height: 2px;
    width: 12px;
  }

  &:before {
    animation: ${N} 0.15s ease-out forwards;
    animation-delay: 180ms;
    transform: rotate(90deg);
  }
`,I=y`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`,$=g("div")`
  width: 12px;
  height: 12px;
  box-sizing: border-box;
  border: 2px solid;
  border-radius: 100%;
  border-color: ${e=>e.secondary||"#e0e0e0"};
  border-right-color: ${e=>e.primary||"#616161"};
  animation: ${I} 1s linear infinite;
`,F=y`
from {
  transform: scale(0) rotate(45deg);
	opacity: 0;
}
to {
  transform: scale(1) rotate(45deg);
	opacity: 1;
}`,_=y`
0% {
	height: 0;
	width: 0;
	opacity: 0;
}
40% {
  height: 0;
	width: 6px;
	opacity: 1;
}
100% {
  opacity: 1;
  height: 10px;
}`,K=g("div")`
  width: 20px;
  opacity: 0;
  height: 20px;
  border-radius: 10px;
  background: ${e=>e.primary||"#61d345"};
  position: relative;
  transform: rotate(45deg);

  animation: ${F} 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
  animation-delay: 100ms;
  &:after {
    content: '';
    box-sizing: border-box;
    animation: ${_} 0.2s ease-out forwards;
    opacity: 0;
    animation-delay: 200ms;
    position: absolute;
    border-right: 2px solid;
    border-bottom: 2px solid;
    border-color: ${e=>e.secondary||"#fff"};
    bottom: 6px;
    left: 6px;
    height: 10px;
    width: 6px;
  }
`,H=g("div")`
  position: absolute;
`,z=g("div")`
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  min-width: 20px;
  min-height: 20px;
`,L=y`
from {
  transform: scale(0.6);
  opacity: 0.4;
}
to {
  transform: scale(1);
  opacity: 1;
}`,U=g("div")`
  position: relative;
  transform: scale(0.6);
  opacity: 0.4;
  min-width: 20px;
  animation: ${L} 0.3s 0.12s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
`,B=({toast:e})=>{let{icon:t,type:i,iconTheme:r}=e;return void 0!==t?"string"==typeof t?s.createElement(U,null,t):t:"blank"===i?null:s.createElement(z,null,s.createElement($,{...r}),"loading"!==i&&s.createElement(H,null,"error"===i?s.createElement(R,{...r}):s.createElement(K,{...r})))},G=g("div")`
  display: flex;
  align-items: center;
  background: #fff;
  color: #363636;
  line-height: 1.3;
  will-change: transform;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1), 0 3px 3px rgba(0, 0, 0, 0.05);
  max-width: 350px;
  pointer-events: auto;
  padding: 8px 10px;
  border-radius: 8px;
`,Z=g("div")`
  display: flex;
  justify-content: center;
  margin: 4px 10px;
  color: inherit;
  flex: 1 1 auto;
  white-space: pre-line;
`,W=s.memo(({toast:e,position:t,style:i,children:r})=>{let a=e.height?((e,t)=>{let i=e.includes("top")?1:-1,[r,s]=x()?["0%{opacity:0;} 100%{opacity:1;}","0%{opacity:1;} 100%{opacity:0;}"]:[`
0% {transform: translate3d(0,${-200*i}%,0) scale(.6); opacity:.5;}
100% {transform: translate3d(0,0,0) scale(1); opacity:1;}
`,`
0% {transform: translate3d(0,0,-1px) scale(1); opacity:1;}
100% {transform: translate3d(0,${-150*i}%,-1px) scale(.6); opacity:0;}
`];return{animation:t?`${y(r)} 0.35s cubic-bezier(.21,1.02,.73,1) forwards`:`${y(s)} 0.4s forwards cubic-bezier(.06,.71,.55,1)`}})(e.position||t||"top-center",e.visible):{opacity:0},n=s.createElement(B,{toast:e}),o=s.createElement(Z,{...e.ariaProps},b(e.message,e));return s.createElement(G,{className:e.className,style:{...a,...i,...e.style}},"function"==typeof r?r({icon:n,message:o}):s.createElement(s.Fragment,null,n,o))});r=s.createElement,l.p=void 0,f=r,p=void 0,m=void 0;var J=({id:e,className:t,style:i,onHeightUpdate:r,children:a})=>{let n=s.useCallback(t=>{if(t){let i=()=>{r(e,t.getBoundingClientRect().height)};i(),new MutationObserver(i).observe(t,{subtree:!0,childList:!0,characterData:!0})}},[e,r]);return s.createElement("div",{ref:n,className:t,style:i},a)},V=h`
  z-index: 9999;
  > * {
    pointer-events: auto;
  }
`;e.s(["Toaster",0,({reverseOrder:e,position:t="top-center",toastOptions:i,gutter:r,children:a,toasterId:n,containerStyle:o,containerClassName:u})=>{let{toasts:l,handlers:c}=((e,t="default")=>{let{toasts:i,pausedAt:r}=((e={},t=w)=>{let[i,r]=(0,s.useState)(E[t]||P),a=(0,s.useRef)(E[t]);(0,s.useEffect)(()=>(a.current!==E[t]&&r(E[t]),O.push([t,r]),()=>{let e=O.findIndex(([e])=>e===t);e>-1&&O.splice(e,1)}),[t]);let n=i.toasts.map(t=>{var i,r,s;return{...e,...e[t.type],...t,removeDelay:t.removeDelay||(null==(i=e[t.type])?void 0:i.removeDelay)||(null==e?void 0:e.removeDelay),duration:t.duration||(null==(r=e[t.type])?void 0:r.duration)||(null==e?void 0:e.duration)||A[t.type],style:{...e.style,...null==(s=e[t.type])?void 0:s.style,...t.style}}});return{...i,toasts:n}})(e,t),a=(0,s.useRef)(new Map).current,n=(0,s.useCallback)((e,t=T)=>{if(a.has(e))return;let i=setTimeout(()=>{a.delete(e),o({type:4,toastId:e})},t);a.set(e,i)},[]);(0,s.useEffect)(()=>{if(r)return;let e=Date.now(),s=i.map(i=>{if(i.duration===1/0)return;let r=(i.duration||0)+i.pauseDuration-(e-i.createdAt);if(r<0){i.visible&&S.dismiss(i.id);return}return setTimeout(()=>S.dismiss(i.id,t),r)});return()=>{s.forEach(e=>e&&clearTimeout(e))}},[i,r,t]);let o=(0,s.useCallback)(D(t),[t]),u=(0,s.useCallback)(()=>{o({type:5,time:Date.now()})},[o]),l=(0,s.useCallback)((e,t)=>{o({type:1,toast:{id:e,height:t}})},[o]),c=(0,s.useCallback)(()=>{r&&o({type:6,time:Date.now()})},[r,o]),d=(0,s.useCallback)((e,t)=>{let{reverseOrder:r=!1,gutter:s=8,defaultPosition:a}=t||{},n=i.filter(t=>(t.position||a)===(e.position||a)&&t.height),o=n.findIndex(t=>t.id===e.id),u=n.filter((e,t)=>t<o&&e.visible).length;return n.filter(e=>e.visible).slice(...r?[u+1]:[0,u]).reduce((e,t)=>e+(t.height||0)+s,0)},[i]);return(0,s.useEffect)(()=>{i.forEach(e=>{if(e.dismissed)n(e.id,e.removeDelay);else{let t=a.get(e.id);t&&(clearTimeout(t),a.delete(e.id))}})},[i,n]),{toasts:i,handlers:{updateHeight:l,startPause:u,endPause:c,calculateOffset:d}}})(i,n);return s.createElement("div",{"data-rht-toaster":n||"",style:{position:"fixed",zIndex:9999,top:16,left:16,right:16,bottom:16,pointerEvents:"none",...o},className:u,onMouseEnter:c.startPause,onMouseLeave:c.endPause},l.map(i=>{let n,o,u=i.position||t,l=c.calculateOffset(i,{reverseOrder:e,gutter:r,defaultPosition:t}),d=(n=u.includes("top"),o=u.includes("center")?{justifyContent:"center"}:u.includes("right")?{justifyContent:"flex-end"}:{},{left:0,right:0,display:"flex",position:"absolute",transition:x()?void 0:"all 230ms cubic-bezier(.21,1.02,.73,1)",transform:`translateY(${l*(n?1:-1)}px)`,...n?{top:0}:{bottom:0},...o});return s.createElement(J,{id:i.id,key:i.id,onHeightUpdate:c.updateHeight,className:i.visible?V:"",style:d},"custom"===i.type?b(i.message,i):a?a(i):s.createElement(W,{toast:i,position:u}))}))},"default",0,S],33260)},18291,e=>{"use strict";e.i(56668);var t=e.i(83548),i=e.i(46992),r=e.i(33260),s=e.i(56487),a=e.i(78562),n=e.i(89432),o=e.i(29135),u=class extends o.Subscribable{constructor(e={}){super(),this.config=e,this.#a=new Map}#a;build(e,t,i){let r=t.queryKey,n=t.queryHash??(0,s.hashQueryKeyByOptions)(r,t),o=this.get(n);return o||(o=new a.Query({client:e,queryKey:r,queryHash:n,options:e.defaultQueryOptions(t),state:i,defaultOptions:e.getQueryDefaults(r)}),this.add(o)),o}add(e){this.#a.has(e.queryHash)||(this.#a.set(e.queryHash,e),this.notify({type:"added",query:e}))}remove(e){let t=this.#a.get(e.queryHash);t&&(e.destroy(),t===e&&this.#a.delete(e.queryHash),this.notify({type:"removed",query:e}))}clear(){n.notifyManager.batch(()=>{this.getAll().forEach(e=>{this.remove(e)})})}get(e){return this.#a.get(e)}getAll(){return[...this.#a.values()]}find(e){let t={exact:!0,...e};return this.getAll().find(e=>(0,s.matchQuery)(t,e))}findAll(e={}){let t=this.getAll();return Object.keys(e).length>0?t.filter(t=>(0,s.matchQuery)(e,t)):t}notify(e){n.notifyManager.batch(()=>{this.listeners.forEach(t=>{t(e)})})}onFocus(){n.notifyManager.batch(()=>{this.getAll().forEach(e=>{e.onFocus()})})}onOnline(){n.notifyManager.batch(()=>{this.getAll().forEach(e=>{e.onOnline()})})}},l=e.i(27910),c=o,d=class extends c.Subscribable{constructor(e={}){super(),this.config=e,this.#n=new Set,this.#o=new Map,this.#u=0}#n;#o;#u;build(e,t,i){let r=new l.Mutation({client:e,mutationCache:this,mutationId:++this.#u,options:e.defaultMutationOptions(t),state:i});return this.add(r),r}add(e){this.#n.add(e);let t=h(e);if("string"==typeof t){let i=this.#o.get(t);i?i.push(e):this.#o.set(t,[e])}this.notify({type:"added",mutation:e})}remove(e){if(this.#n.delete(e)){let t=h(e);if("string"==typeof t){let i=this.#o.get(t);if(i)if(i.length>1){let t=i.indexOf(e);-1!==t&&i.splice(t,1)}else i[0]===e&&this.#o.delete(t)}}this.notify({type:"removed",mutation:e})}canRun(e){let t=h(e);if("string"!=typeof t)return!0;{let i=this.#o.get(t),r=i?.find(e=>"pending"===e.state.status);return!r||r===e}}runNext(e){let t=h(e);if("string"!=typeof t)return Promise.resolve();{let i=this.#o.get(t)?.find(t=>t!==e&&t.state.isPaused);return i?.continue()??Promise.resolve()}}clear(){n.notifyManager.batch(()=>{this.#n.forEach(e=>{this.notify({type:"removed",mutation:e})}),this.#n.clear(),this.#o.clear()})}getAll(){return Array.from(this.#n)}find(e){let t={exact:!0,...e};return this.getAll().find(e=>(0,s.matchMutation)(t,e))}findAll(e={}){return this.getAll().filter(t=>(0,s.matchMutation)(e,t))}notify(e){n.notifyManager.batch(()=>{this.listeners.forEach(t=>{t(e)})})}resumePausedMutations(){let e=this.getAll().filter(e=>e.state.isPaused);return n.notifyManager.batch(()=>Promise.all(e.map(e=>e.continue().catch(s.noop))))}};function h(e){return e.options.scope?.id}var f=e.i(17291),p=e.i(53703),m=class{#l;#i;#c;#d;#h;#f;#p;#m;constructor(e={}){this.#l=e.queryCache||new u,this.#i=e.mutationCache||new d,this.#c=e.defaultOptions||{},this.#d=new Map,this.#h=new Map,this.#f=0}mount(){this.#f++,1===this.#f&&(this.#p=f.focusManager.subscribe(async e=>{e&&(await this.resumePausedMutations(),this.#l.onFocus())}),this.#m=p.onlineManager.subscribe(async e=>{e&&(await this.resumePausedMutations(),this.#l.onOnline())}))}unmount(){this.#f--,0===this.#f&&(this.#p?.(),this.#p=void 0,this.#m?.(),this.#m=void 0)}isFetching(e){return this.#l.findAll({...e,fetchStatus:"fetching"}).length}isMutating(e){return this.#i.findAll({...e,status:"pending"}).length}getQueryData(e){let t=this.defaultQueryOptions({queryKey:e});return this.#l.get(t.queryHash)?.state.data}ensureQueryData(e){let t=this.defaultQueryOptions(e),i=this.#l.build(this,t),r=i.state.data;return void 0===r?this.fetchQuery(e):(e.revalidateIfStale&&i.isStaleByTime((0,s.resolveStaleTime)(t.staleTime,i))&&this.prefetchQuery(t),Promise.resolve(r))}getQueriesData(e){return this.#l.findAll(e).map(({queryKey:e,state:t})=>[e,t.data])}setQueryData(e,t,i){let r=this.defaultQueryOptions({queryKey:e}),a=this.#l.get(r.queryHash),n=a?.state.data,o=(0,s.functionalUpdate)(t,n);if(void 0!==o)return this.#l.build(this,r).setData(o,{...i,manual:!0})}setQueriesData(e,t,i){return n.notifyManager.batch(()=>this.#l.findAll(e).map(({queryKey:e})=>[e,this.setQueryData(e,t,i)]))}getQueryState(e){let t=this.defaultQueryOptions({queryKey:e});return this.#l.get(t.queryHash)?.state}removeQueries(e){let t=this.#l;n.notifyManager.batch(()=>{t.findAll(e).forEach(e=>{t.remove(e)})})}resetQueries(e,t){let i=this.#l;return n.notifyManager.batch(()=>(i.findAll(e).forEach(e=>{e.reset()}),this.refetchQueries({type:"active",...e},t)))}cancelQueries(e,t={}){let i={revert:!0,...t};return Promise.all(n.notifyManager.batch(()=>this.#l.findAll(e).map(e=>e.cancel(i)))).then(s.noop).catch(s.noop)}invalidateQueries(e,t={}){return n.notifyManager.batch(()=>(this.#l.findAll(e).forEach(e=>{e.invalidate()}),e?.refetchType==="none")?Promise.resolve():this.refetchQueries({...e,type:e?.refetchType??e?.type??"active"},t))}refetchQueries(e,t={}){let i={...t,cancelRefetch:t.cancelRefetch??!0};return Promise.all(n.notifyManager.batch(()=>this.#l.findAll(e).filter(e=>!e.isDisabled()&&!e.isStatic()).map(e=>{let t=e.fetch(void 0,i);return i.throwOnError||(t=t.catch(s.noop)),"paused"===e.state.fetchStatus?Promise.resolve():t}))).then(s.noop)}fetchQuery(e){let t=this.defaultQueryOptions(e);void 0===t.retry&&(t.retry=!1);let i=this.#l.build(this,t);return i.isStaleByTime((0,s.resolveStaleTime)(t.staleTime,i))?i.fetch(t):Promise.resolve(i.state.data)}prefetchQuery(e){return this.fetchQuery(e).then(s.noop).catch(s.noop)}fetchInfiniteQuery(e){return e._type="infinite",this.fetchQuery(e)}prefetchInfiniteQuery(e){return this.fetchInfiniteQuery(e).then(s.noop).catch(s.noop)}ensureInfiniteQueryData(e){return e._type="infinite",this.ensureQueryData(e)}resumePausedMutations(){return p.onlineManager.isOnline()?this.#i.resumePausedMutations():Promise.resolve()}getQueryCache(){return this.#l}getMutationCache(){return this.#i}getDefaultOptions(){return this.#c}setDefaultOptions(e){this.#c=e}setQueryDefaults(e,t){this.#d.set((0,s.hashKey)(e),{queryKey:e,defaultOptions:t})}getQueryDefaults(e){let t=[...this.#d.values()],i={};return t.forEach(t=>{(0,s.partialMatchKey)(e,t.queryKey)&&Object.assign(i,t.defaultOptions)}),i}setMutationDefaults(e,t){this.#h.set((0,s.hashKey)(e),{mutationKey:e,defaultOptions:t})}getMutationDefaults(e){let t=[...this.#h.values()],i={};return t.forEach(t=>{(0,s.partialMatchKey)(e,t.mutationKey)&&Object.assign(i,t.defaultOptions)}),i}defaultQueryOptions(e){if(e._defaulted)return e;let t={...this.#c.queries,...this.getQueryDefaults(e.queryKey),...e,_defaulted:!0};return t.queryHash||(t.queryHash=(0,s.hashQueryKeyByOptions)(t.queryKey,t)),void 0===t.refetchOnReconnect&&(t.refetchOnReconnect="always"!==t.networkMode),void 0===t.throwOnError&&(t.throwOnError=!!t.suspense),!t.networkMode&&t.persister&&(t.networkMode="offlineFirst"),t.queryFn===s.skipToken&&(t.enabled=!1),t}defaultMutationOptions(e){return e?._defaulted?e:{...this.#c.mutations,...e?.mutationKey&&this.getMutationDefaults(e.mutationKey),...e,_defaulted:!0}}clear(){this.#l.clear(),this.#i.clear()}};let y=new Set(["PGRST301","42501","PGRST116"]),g=new m({defaultOptions:{queries:{staleTime:3e4,gcTime:3e5,retry:(e,t)=>!(e>=1||t?.code&&y.has(t.code)),refetchOnWindowFocus:!0,refetchOnReconnect:!0,refetchOnMount:!0},mutations:{retry:0}}});var b=e.i(26240);e.s(["Providers",0,function({initialUser:e,children:s}){return(0,t.jsxs)(i.QueryClientProvider,{client:g,children:[(0,t.jsxs)(b.AuthProvider,{initialUser:e,children:[s,(0,t.jsx)(r.Toaster,{position:"top-right"})]}),!1]})}],18291)}]);