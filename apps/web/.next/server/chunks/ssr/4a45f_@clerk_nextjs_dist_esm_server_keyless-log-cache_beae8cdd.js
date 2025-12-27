module.exports=[903111,a=>{"use strict";a.i(15209);var b=a.i(451515);let c=a=>`
\x1b[35m
[Clerk]:\x1b[0m You are running in keyless mode.
You can \x1b[35mclaim your keys\x1b[0m by visiting ${a.claimUrl}
`,d=()=>`
\x1b[35m
[Clerk]:\x1b[0m Your application is running with your claimed keys.
You can safely remove the \x1b[35m.clerk/\x1b[0m from your project.
`,e=function(){if((0,b.isDevelopmentEnvironment)())return a.g.__clerk_internal_keyless_logger||(a.g.__clerk_internal_keyless_logger={__cache:new Map,log:function({cacheKey:a,msg:b}){var c;this.__cache.has(a)&&Date.now()<((null==(c=this.__cache.get(a))?void 0:c.expiresAt)||0)||(console.log(b),this.__cache.set(a,{expiresAt:Date.now()+6e5}))},run:async function(a,{cacheKey:b,onSuccessStale:c=6e5,onErrorStale:d=6e5}){var e,f;if(this.__cache.has(b)&&Date.now()<((null==(e=this.__cache.get(b))?void 0:e.expiresAt)||0))return null==(f=this.__cache.get(b))?void 0:f.data;try{let d=await a();return this.__cache.set(b,{expiresAt:Date.now()+c,data:d}),d}catch(a){throw this.__cache.set(b,{expiresAt:Date.now()+d}),a}}}),globalThis.__clerk_internal_keyless_logger}();a.s(["clerkDevelopmentCache",()=>e,"createConfirmationMessage",()=>d,"createKeylessModeMessage",()=>c])}];

//# sourceMappingURL=4a45f_%40clerk_nextjs_dist_esm_server_keyless-log-cache_beae8cdd.js.map