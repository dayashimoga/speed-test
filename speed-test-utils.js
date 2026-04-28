/* ═══════════════════════════════════════════════════
   Speed Test Utilities — Pure Functions Module
   Extracted from script.js IIFE for testability
   ═══════════════════════════════════════════════════ */

// ── Math Helpers ──
export function mean(arr) {
    return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

export function stddev(arr) {
    const m = mean(arr);
    return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length);
}

export function median(arr) {
    if (!arr.length) return 0;
    const s = [...arr].sort((a, b) => a - b);
    return s.length % 2
        ? s[Math.floor(s.length / 2)]
        : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
}

// ── MOS Score Calculation (ITU-T E-Model simplified) ──
export function calcMOS(latency, jitter, loss) {
    const R = 93.2 - latency * 0.1 - jitter * 0.4 - loss * 2.5;
    const clampedR = Math.max(0, Math.min(R, 100));
    if (clampedR <= 0) return 1.0;
    const mos = 1 + 0.035 * clampedR + 0.000007 * clampedR * (clampedR - 60) * (100 - clampedR);
    return parseFloat(Math.max(1, Math.min(mos, 4.5)).toFixed(2));
}

// ── AIM-style Network Quality Score ──
export function calcQualityScore(dl, ul, lat, jit, loss) {
    let score = 100;
    // Latency penalties
    if (lat > 100) score -= 25;
    else if (lat > 50) score -= 12;
    else if (lat > 30) score -= 4;
    // Jitter penalties
    if (jit > 30) score -= 15;
    else if (jit > 15) score -= 8;
    else if (jit > 8) score -= 3;
    // Packet loss
    score -= loss * 5;
    // Download penalties
    if (dl < 5)   score -= 30;
    else if (dl < 25)  score -= 15;
    else if (dl < 100) score -= 5;
    // Upload penalties
    if (ul < 2)   score -= 10;
    else if (ul < 10)  score -= 4;
    return Math.max(0, Math.min(100, Math.round(score)));
}

// ── Grade From Score ──
export function gradeFromScore(score) {
    if (score >= 90) return { letter: 'A+', label: 'Excellent', color: '#4ade80' };
    if (score >= 75) return { letter: 'A',  label: 'Very Good', color: '#86efac' };
    if (score >= 60) return { letter: 'B',  label: 'Good',      color: '#38bdf8' };
    if (score >= 45) return { letter: 'C',  label: 'Fair',      color: '#fbbf24' };
    if (score >= 25) return { letter: 'D',  label: 'Poor',      color: '#f97316' };
    return { letter: 'F', label: 'Very Poor', color: '#ef4444' };
}

// ── Bufferbloat Grade ──
export function bufferbloatGrade(unloaded, loaded) {
    const diff = loaded - unloaded;
    if (diff < 5)   return { grade: 'A', label: 'No Bufferbloat',       color: '#4ade80' };
    if (diff < 30)  return { grade: 'B', label: 'Low Bufferbloat',      color: '#86efac' };
    if (diff < 60)  return { grade: 'C', label: 'Moderate Bufferbloat', color: '#fbbf24' };
    if (diff < 200) return { grade: 'D', label: 'High Bufferbloat',     color: '#f97316' };
    return { grade: 'F', label: 'Severe Bufferbloat', color: '#ef4444' };
}

// ── Test ID Generator ──
export function generateTestId() {
    return 'QU-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
}

// ── AI Insights Generator ──
export function generateInsights(dl, ul, lat, jit, loss, mos, bloatGrade) {
    const tips = [];
    if (dl >= 500) tips.push('Ultra-fast downloads. Supports 8K streaming and enterprise workloads.');
    else if (dl >= 100) tips.push('Excellent download speed. Perfect for 4K streaming on multiple devices.');
    else if (dl >= 25)  tips.push('Solid HD streaming. Comfortably handles 1080p video.');
    else tips.push('Slow downloads. Consider upgrading your plan.');

    if (ul >= 100) tips.push('Pro-grade upload. Ideal for live streaming and cloud collaboration.');
    else if (ul >= 20) tips.push('Good upload speed. Supports Zoom and remote work.');
    else tips.push('Upload bottleneck. May cause issues with video calls.');

    if (lat < 20 && jit < 5) tips.push('Gaming-ready. Sub-20ms ping with ultra-low jitter.');
    else if (lat < 50) tips.push('Low latency. Suitable for online gaming.');
    else if (lat > 100) tips.push('High latency detected. Consider using a wired connection.');

    if (loss > 5) tips.push('Significant packet loss! Check your router/cables.');
    else if (loss > 1) tips.push('Minor packet loss. Usually harmless for browsing.');
    else tips.push('Zero packet loss. Connection is rock-solid.');

    if (bloatGrade.grade === 'A') tips.push('No Bufferbloat. Router manages latency under load excellently.');
    else if (bloatGrade.grade === 'F') tips.push('Severe Bufferbloat! Enable SQM/QoS on your router.');
    else if (bloatGrade.grade === 'D') tips.push('High Bufferbloat. Consider enabling SQM in router settings.');

    const mosNum = parseFloat(mos);
    if (mosNum >= 4.0) tips.push(`VoIP Quality: Excellent (MOS ${mos}).`);
    else if (mosNum >= 3.5) tips.push(`VoIP Quality: Good (MOS ${mos}).`);
    else tips.push(`VoIP Quality: Poor (MOS ${mos}).`);

    return tips;
}

// ── CSV Export Formatter ──
export function formatResultsCSV(results) {
    const headers = ['Date', 'Download (Mbps)', 'Upload (Mbps)', 'Ping (ms)', 'Jitter (ms)', 'Packet Loss (%)', 'MOS', 'Grade'];
    const rows = results.map(r =>
        [r.date, r.dl, r.ul, r.lat, r.jit, r.loss, r.mos, r.letter].join(',')
    );
    return [headers.join(','), ...rows].join('\n');
}

// ── Connection Stability Score ──
export function calcStabilityScore(samples) {
    if (!samples || samples.length < 3) return { score: 0, label: 'Insufficient Data' };
    const sd = stddev(samples);
    const avg = mean(samples);
    if (avg === 0) return { score: 0, label: 'No Data' };
    const cv = (sd / avg) * 100; // coefficient of variation
    if (cv < 5) return { score: 100, label: 'Rock Solid' };
    if (cv < 15) return { score: 80, label: 'Stable' };
    if (cv < 30) return { score: 60, label: 'Moderate Variance' };
    if (cv < 50) return { score: 40, label: 'Unstable' };
    return { score: 20, label: 'Highly Unstable' };
}
