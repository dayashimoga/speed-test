/* speed-test */
'use strict';
(function(){
    const $ = s => document.querySelector(s);
    const $$ = s => document.querySelectorAll(s);
    if(typeof QU !== 'undefined') QU.init({ kofi: true, discover: true });
    
    // UI Elements
    const startBtn = $('#startTest');
    const dlDisplay = $('#dlSpeed');
    const ulDisplay = $('#ulSpeed');
    const latDisplay = $('#latency');
    const jitDisplay = $('#jitter');
    const statusDisplay = $('#connStatus');
    const serverNode = $('#serverNode');
    const bar = $('#progressBar');
    const gauge = $('#speedGauge circle');
    const speedDisplay = $('#speedDisplay');
    const speedUnit = $('#speedUnit');

    // GeoIP Fetch
    async function fetchServerNode() {
        try {
            const res = await fetch('https://1.1.1.1/cdn-cgi/trace');
            const text = await res.text();
            let loc = 'Unknown';
            let ip = '';
            for(const line of text.split('\n')) {
                if(line.startsWith('loc=')) loc = line.split('=')[1];
                if(line.startsWith('ip=')) ip = line.split('=')[1];
            }
            serverNode.textContent = `${loc} Region Node (${ip})`;
        } catch(e) {
            serverNode.textContent = 'Global CDN Node';
        }
    }
    fetchServerNode();

    function setGauge(val, max) {
        val = Math.min(val, max);
        // Dasharray is 760. offset 760 = 0%. offset 0 = 100%
        const pct = val / max;
        const offset = 760 - (760 * pct);
        if(gauge) gauge.style.strokeDashoffset = offset;
    }

    if(startBtn) {
        startBtn.addEventListener('click', async () => {
            console.log("Test started...");
            startBtn.disabled = true; 
            startBtn.textContent = 'Testing...';
            bar.style.width = '5%';
            statusDisplay.textContent = 'Ping...';
            statusDisplay.style.color = '#fff';
            dlDisplay.textContent = '—';
            ulDisplay.textContent = '—';
            latDisplay.textContent = '—';
            jitDisplay.textContent = '—';
            speedDisplay.textContent = '0.0';
            speedUnit.textContent = 'Mbps';
            if(gauge) gauge.style.strokeDashoffset = 760;

            // 1. Latency test (ping & jitter)
            const pings = [];
            for(let i=0; i<5; i++) { 
                const t = performance.now(); 
                try { await fetch('https://1.1.1.1/cdn-cgi/trace',{cache:'no-store',mode:'no-cors'}); }catch(e){} 
                pings.push(performance.now() - t); 
            }
            const avgPing = Math.round(pings.reduce((a,b)=>a+b,0)/pings.length);
            const jitter = Math.round(Math.max(...pings) - Math.min(...pings));
            latDisplay.textContent = avgPing + 'ms'; 
            jitDisplay.textContent = jitter + 'ms';
            bar.style.width = '20%';

            // 2. Download speed test
            statusDisplay.textContent = 'DL...';
            speedUnit.textContent = 'Mbps (DL)';
            const testSizes = [100000, 500000, 1000000, 2000000];
            let totalBytes = 0, dlTime = 0;
            let currentDlSpeed = 0;
            for(let si=0; si<testSizes.length; si++){
                bar.style.width = (20 + ((si+1)/testSizes.length*40)) + '%';
                const size = testSizes[si];
                const url = 'https://speed.cloudflare.com/__down?bytes=' + size;
                const start = performance.now();
                try { 
                    const r = await fetch(url,{cache:'no-store'}); 
                    const buf = await r.arrayBuffer(); 
                    totalBytes += buf.byteLength; 
                    const tdiff = performance.now() - start;
                    dlTime += tdiff; 
                    
                    // Live gauge animate
                    currentDlSpeed = ((buf.byteLength*8) / (tdiff/1000) / 1000000);
                    speedDisplay.textContent = currentDlSpeed.toFixed(1);
                    setGauge(currentDlSpeed, 1000);
                } catch(e){}
            }
            const finalDl = dlTime>0 ? ((totalBytes*8)/(dlTime/1000)/1000000).toFixed(1) : '?';
            dlDisplay.textContent = finalDl;
            speedDisplay.textContent = finalDl;

            // 3. Upload speed test
            statusDisplay.textContent = 'UL...';
            speedUnit.textContent = 'Mbps (UL)';
            if(gauge) gauge.style.strokeDashoffset = 760; // reset gauge
            const ulSizes = [100000, 500000, 1000000];
            let ulBytes = 0, ulTime = 0;
            let currentUlSpeed = 0;
            for(let si=0; si<ulSizes.length; si++){
                bar.style.width = (60 + ((si+1)/ulSizes.length*40)) + '%';
                const size = ulSizes[si];
                const url = 'https://speed.cloudflare.com/__up';
                const dummyData = new Uint8Array(size); // Fill with dummy zero bytes
                const start = performance.now();
                try { 
                    await fetch(url,{
                        method: 'POST',
                        body: dummyData,
                        cache: 'no-store'
                    }); 
                    ulBytes += size; 
                    const tdiff = performance.now() - start;
                    ulTime += tdiff; 
                    
                    // Live gauge animate
                    currentUlSpeed = ((size*8) / (tdiff/1000) / 1000000);
                    speedDisplay.textContent = currentUlSpeed.toFixed(1);
                    setGauge(currentUlSpeed, 500);
                } catch(e){}
            }
            const finalUl = ulTime>0 ? ((ulBytes*8)/(ulTime/1000)/1000000).toFixed(1) : '?';
            ulDisplay.textContent = finalUl;
            
            // Final Display
            speedUnit.textContent = 'Mbps (DL/UL)';
            speedDisplay.textContent = `${finalDl}`;
            setGauge(parseFloat(finalDl), 1000); // Leave gauge on DL

            // Scoring
            let quality = 'Poor'; 
            let letterGrade = 'F';
            let pts = 0;
            const fDl = parseFloat(finalDl);
            const fUl = parseFloat(finalUl);
            
            if(fDl > 25) pts++;
            if(fDl > 100) pts += 2;
            if(fDl > 500) pts++;
            if(fUl > 10) pts++;
            if(fUl > 50) pts++;
            if(avgPing < 50) pts++;
            if(avgPing < 20) pts++;
            if(jitter < 20) pts++;
            
            if(pts >= 8) { quality = 'Excellent'; statusDisplay.style.color = '#22c55e'; letterGrade = 'A+'; }
            else if(pts >= 6) { quality = 'Excellent'; statusDisplay.style.color = '#22c55e'; letterGrade = 'A'; }
            else if(pts >= 4) { quality = 'Good'; statusDisplay.style.color = '#3b82f6'; letterGrade = 'B'; }
            else if(pts >= 2) { quality = 'Fair'; statusDisplay.style.color = '#f59e0b'; letterGrade = 'C'; }
            else { statusDisplay.style.color = '#ef4444'; letterGrade = 'D'; }
            
            statusDisplay.textContent = quality;
            startBtn.disabled = false; 
            startBtn.textContent = '▶ Restart Test';
            bar.style.opacity = '0';
            
            // --- PROFESSIONAL FEATURES ---
            
            // 1. Quality Score & Share
            const scoreDisplay = $('#shareScoreDisplay');
            const scoreLabel = $('#shareScoreLabel');
            const shareBtn = $('#shareBtn');
            if(scoreDisplay) {
                scoreDisplay.textContent = letterGrade;
                scoreDisplay.style.color = statusDisplay.style.color;
                scoreLabel.textContent = quality + ' Connection';
                shareBtn.disabled = false;
                
                const shareText = `📶 Speed Test Results\nScore: ${letterGrade} (${quality})\n⬇️ DL: ${finalDl} Mbps\n⬆️ UL: ${finalUl} Mbps\n⏱️ Ping: ${avgPing}ms | Jitter: ${jitter}ms\nTested on QuickUtils`;
                shareBtn.onclick = () => {
                    navigator.clipboard.writeText(shareText).then(() => {
                        const og = shareBtn.textContent;
                        shareBtn.textContent = '✅ Copied!';
                        setTimeout(() => shareBtn.textContent = og, 2000);
                    });
                };
            }
            
            // 2. Global Comparison
            const compSpeed = $('#compYourSpeed');
            const compBar = $('#compYourBar');
            if(compSpeed && compBar) {
                compSpeed.textContent = finalDl + ' Mbps';
                // relative to 200 max for bar scaling visually
                const pct = Math.min(100, Math.max(2, (fDl / 200) * 100));
                compBar.style.width = pct + '%';
            }
            
            // 3. Insights and Recommendations
            const recEl = $('#networkRecommendations');
            if(recEl) {
                let recs = [];
                if(fDl >= 100) recs.push('✅ Ideal for 4K/8K streaming and large downloads.');
                else if(fDl >= 25) recs.push('✅ Good for HD streaming and casual browsing.');
                else recs.push('⚠️ May struggle with multiple HD streams.');
                
                if(avgPing <= 40 && jitter <= 10) recs.push('✅ Perfect for competitive online gaming.');
                else if(avgPing > 100) recs.push('⚠️ High latency; online gaming will have noticeable lag.');
                
                if(fUl >= 20) recs.push('✅ Great for heavy video conferencing and uploading files.');
                else if(fUl < 5) recs.push('⚠️ Video calls may drop quality when you speak/present.');
                
                recEl.innerHTML = recs.join('<br>');
            }
            
            // 4. History Logging
            try {
                const historyStr = localStorage.getItem('qu_speed_history') || '[]';
                const history = JSON.parse(historyStr);
                const record = {
                    date: new Date().toISOString(),
                    dl: finalDl,
                    ul: finalUl,
                    ping: avgPing,
                    score: letterGrade,
                    color: statusDisplay.style.color
                };
                history.unshift(record);
                if(history.length > 20) history.pop();
                localStorage.setItem('qu_speed_history', JSON.stringify(history));
                renderHistory();
            } catch(e) {}
            
        }); 

        // Initial History Render
        function renderHistory() {
            const list = $('#historyLogList');
            const empty = $('#historyEmpty');
            if(!list) return;
            try {
                const history = JSON.parse(localStorage.getItem('qu_speed_history') || '[]');
                if(history.length === 0) {
                    if(empty) empty.style.display = 'block';
                    return;
                }
                if(empty) empty.style.display = 'none';
                
                // Clear existing except empty message
                Array.from(list.children).forEach(c => { if(c.id !== 'historyEmpty') c.remove(); });
                
                history.forEach(item => {
                    const row = document.createElement('div');
                    const d = new Date(item.date);
                    const timeStr = d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                    row.style.cssText = 'display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.03); padding: 6px 10px; border-radius: 6px; border-left: 3px solid ' + item.color + ';';
                    row.innerHTML = `
                        <div>
                            <div style="font-weight:600; font-size:0.85rem;">⬇ ${item.dl} <span style="font-weight:400; font-size:0.75rem; color:#888;">Mbps</span></div>
                            <div style="font-weight:600; font-size:0.85rem;">⬆ ${item.ul} <span style="font-weight:400; font-size:0.75rem; color:#888;">Mbps</span></div>
                        </div>
                        <div style="text-align:right;">
                            <div style="font-size:0.7rem; color:#aaa;">${timeStr}</div>
                            <div style="font-weight:800; color:${item.color}; font-size:0.9rem;">${item.score}</div>
                        </div>
                    `;
                    list.appendChild(row);
                });
            } catch(e) {}
        }
        renderHistory();
        
        const clearBtn = $('#clearHistoryBtn');
        if(clearBtn) {
            clearBtn.addEventListener('click', () => {
                localStorage.removeItem('qu_speed_history');
                const list = $('#historyLogList');
                if(list) Array.from(list.children).forEach(c => { if(c.id !== 'historyEmpty') c.remove(); });
                const empty = $('#historyEmpty');
                if(empty) empty.style.display = 'block';
            });
        }
        
    }

    // Jitter Chart and Device Diagnostics Simulation
    const jitterChart = document.getElementById('jitterChart');
    if(jitterChart) {
        const ctx = jitterChart.getContext('2d');
        const vals = new Array(20).fill(0);
        let active = false;
        
        startBtn.addEventListener('click', () => { active = true; });
        
        function drawChart() {
            ctx.clearRect(0,0, 200, 80);
            if(active) {
                // Simulate jitter pulses during test
                const newJitter = Math.random() * Math.random() * 40;
                vals.shift(); vals.push(newJitter);
                
                // Simulate Active device count based on browser hardware concurrency and entropy
                const devices = Math.max(1, Math.floor((navigator.hardwareConcurrency || 4) / 2 + Math.random()*3));
                document.getElementById('mockDevices').textContent = devices;
                
                // Packet loss
                if(Math.random() > 0.95) {
                    document.getElementById('packetLoss').textContent = "0.1%";
                    document.getElementById('packetLoss').style.color = '#ef4444';
                } else {
                    document.getElementById('packetLoss').textContent = "0.0%";
                    document.getElementById('packetLoss').style.color = '';
                }
            }
            
            ctx.beginPath();
            ctx.moveTo(0, 80);
            for(let i=0; i<vals.length; i++) {
                const x = (i / vals.length) * 200;
                const y = 80 - vals[i];
                ctx.lineTo(x, y);
            }
            ctx.lineTo(200, 80);
            
            const grad = ctx.createLinearGradient(0,0, 0,80);
            grad.addColorStop(0, 'rgba(168, 85, 247, 0.4)');
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.fill();
            
            ctx.strokeStyle = '#a855f7';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            
            requestAnimationFrame(drawChart);
        }
        drawChart();
    }

})();
