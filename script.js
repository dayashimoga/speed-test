/* speed-test */
'use strict';
(function(){
    const $ = s => document.querySelector(s);
    const $$ = s => document.querySelectorAll(s);
    if(typeof QU !== 'undefined') QU.init({ kofi: true, discover: true });
    
    const startBtn = $('#startTest');
    if(startBtn) {
        startBtn.addEventListener('click', async()=>{
            $('#startTest').disabled=true; 
            if($('#connStatus')) $('#connStatus').textContent='Testing...';
        // Latency test (ping)
        const pings=[];
        for(let i=0;i<5;i++){ const t=performance.now(); try{await fetch('https://www.cloudflare.com/cdn-cgi/trace',{cache:'no-store',mode:'no-cors'});}catch(e){} pings.push(performance.now()-t); }
        const avgPing=Math.round(pings.reduce((a,b)=>a+b,0)/pings.length);
        const jitter=Math.round(Math.max(...pings)-Math.min(...pings));
        $('#latency').textContent=avgPing+'ms'; $('#jitter').textContent=jitter+'ms';
        // Download speed test
        const testSizes=[100000,500000,1000000,2000000];
        let totalBytes=0, totalTime=0;
        for(let si=0;si<testSizes.length;si++){
            $('#progressBar').style.width=((si+1)/testSizes.length*100)+'%';
            const size=testSizes[si];
            const url='https://speed.cloudflare.com/__down?bytes='+size;
            const start=performance.now();
            try{ const r=await fetch(url,{cache:'no-store'}); const buf=await r.arrayBuffer(); totalBytes+=buf.byteLength; totalTime+=performance.now()-start; }catch(e){}
        }
        const speedMbps=totalTime>0?((totalBytes*8)/(totalTime/1000)/1000000).toFixed(1):'?';
        $('#speedDisplay').textContent=speedMbps;
        let quality='Poor'; if(speedMbps>5)quality='Fair'; if(speedMbps>25)quality='Good'; if(speedMbps>100)quality='Excellent';
        $('#connStatus').textContent=quality; $('#connStatus').style.color=speedMbps>25?'#22c55e':'#f59e0b';
        $('#startTest').disabled=false; $('#progressBar').style.width='100%';
    });

})();
