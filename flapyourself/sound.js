/* ══ SOUND ENGINE ══ */
let AC = null, sfxOn = true, sfxMuted = false;
const getAC = () => { if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); return AC; };
function tone(f, t, d, v = .14, f2 = null, dl = 0) {
    if (!sfxOn || sfxMuted) return;
    try {
        const ac = getAC(), o = ac.createOscillator(), g = ac.createGain();
        o.connect(g); g.connect(ac.destination); o.type = t;
        o.frequency.setValueAtTime(f, ac.currentTime + dl);
        if (f2) o.frequency.exponentialRampToValueAtTime(f2, ac.currentTime + dl + d);
        g.gain.setValueAtTime(v, ac.currentTime + dl);
        g.gain.exponentialRampToValueAtTime(.001, ac.currentTime + dl + d);
        o.start(ac.currentTime + dl); o.stop(ac.currentTime + dl + d + .02);
    } catch (e) { }
}
const sFlap = () => tone(540, 'square', .07, .11, 820);
const sScore = () => { tone(880, 'sine', .11, .13, 1100); tone(1100, 'sine', .09, .09, 1320, .07); };
const sHit = () => { tone(110, 'sawtooth', .22, .18, 38); tone(70, 'square', .28, .12, 28, .04); };
const sDie = () => setTimeout(() => tone(430, 'sawtooth', .48, .1, 75), 100);
const sTick = () => tone(600, 'square', .04, .06, 680);

function toggleSFX() {
    sfxOn = !sfxOn;
    const sw = document.getElementById('sfxSw'), lb = document.getElementById('sfxLbl');
    sw.classList.toggle('on', sfxOn); lb.className = 'sw-lbl' + (sfxOn ? ' on' : '');
    lb.textContent = sfxOn ? 'On' : 'Off'; if (sfxOn) sTick();
}
function toggleMuteSFX() {
    sfxMuted = !sfxMuted;
    const b = document.getElementById('sfxMuteBtn');
    b.textContent = sfxMuted ? '🔇' : '🔊'; b.classList.toggle('red', sfxMuted);
}