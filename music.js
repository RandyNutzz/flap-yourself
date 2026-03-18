/* ══ MP3 ══ */
const mp3Audio = document.getElementById('mp3Audio');
let mp3Loaded = false, mp3Playing = false, mp3LoopOn = true;
mp3Audio.volume = .6; mp3Audio.loop = true;

document.getElementById('mp3In').addEventListener('change', e => loadMp3(e.target.files[0]));
const mp3Drop = document.getElementById('mp3Drop');
mp3Drop.addEventListener('dragover', e => { e.preventDefault(); mp3Drop.classList.add('drag'); });
mp3Drop.addEventListener('dragleave', () => mp3Drop.classList.remove('drag'));
mp3Drop.addEventListener('drop', e => { e.preventDefault(); mp3Drop.classList.remove('drag'); const f = e.dataTransfer.files[0]; if (f && f.type.startsWith('audio/')) loadMp3(f); });

function loadMp3(f) {
    if (!f) return;
    mp3Audio.src = URL.createObjectURL(f);
    mp3Loaded = true; mp3Playing = false;
    mp3Drop.classList.add('done');
    document.getElementById('mp3Txt').textContent = '✓ ' + f.name;
    document.getElementById('mp3Name').textContent = f.name.replace(/\.[^.]+$/, '');
    document.getElementById('mp3Name').classList.remove('empty');
    document.getElementById('mp3Bar').style.display = 'flex';
    sTick();
}
function toggleMp3() {
    if (!mp3Loaded) return;
    if (mp3Playing) { mp3Audio.pause(); mp3Playing = false; document.getElementById('mp3Btn').textContent = '▶'; }
    else { mp3Audio.play().catch(() => { }); mp3Playing = true; document.getElementById('mp3Btn').textContent = '⏸'; }
}
function toggleLoop() {
    mp3LoopOn = !mp3LoopOn; mp3Audio.loop = mp3LoopOn;
    document.getElementById('mp3Loop').classList.toggle('on', mp3LoopOn);
}

/* ══ SOUNDCLOUD ══
   SoundCloud embeds work reliably — the iframe loads the SC widget directly.
   We use the SoundCloud Widget API (loaded via postMessage) for play/pause/volume.
   Almost all SC tracks allow embedding — free tracks always do.
══════════════════════════════════════ */
let scLoaded = false, scPlaying = false, scWidget = null, scCurrentVol = 60;

function setSCNote(msg, cls = '') {
    const el = document.getElementById('scNote');
    el.textContent = msg; el.className = 'yt-note' + (cls ? ' ' + cls : '');
}

function buildSCEmbedUrl(trackUrl) {
    // SC embed src format
    return 'https://w.soundcloud.com/player/?url=' + encodeURIComponent(trackUrl)
        + '&color=%23ff5500&auto_play=false&hide_related=true&show_comments=false'
        + '&show_user=true&show_reposts=false&show_teaser=false&visual=false';
}

function isSCUrl(url) {
    return /soundcloud\.com\//.test(url);
}

function loadSC() {
    const raw = document.getElementById('scUrl').value.trim();
    if (!raw) { setSCNote('Paste a SoundCloud URL first.', 'bad'); return; }
    if (!isSCUrl(raw)) { setSCNote('That doesn\'t look like a SoundCloud URL. Try e.g. soundcloud.com/artist/track', 'bad'); return; }

    setSCNote('Loading...', 'loading');
    scLoaded = false; scPlaying = false;
    document.getElementById('scBar').style.display = 'none';

    const frame = document.getElementById('scFrame');
    frame.src = buildSCEmbedUrl(raw);
    document.getElementById('scPlayerWrap').style.display = 'block';

    // Use SoundCloud Widget API via postMessage
    // Load the SC Widget API script once
    if (!window._scApiLoaded) {
        window._scApiLoaded = true;
        const s = document.createElement('script');
        s.src = 'https://w.soundcloud.com/player/api.js';
        s.onload = () => initSCWidget();
        document.head.appendChild(s);
    } else {
        // slight delay to let iframe reload
        setTimeout(initSCWidget, 800);
    }
}

function initSCWidget() {
    const frame = document.getElementById('scFrame');
    if (!window.SC || !frame) return;
    scWidget = SC.Widget(frame);
    scWidget.bind(SC.Widget.Events.READY, () => {
        scLoaded = true;
        scWidget.setVolume(scCurrentVol);
        setSCNote('✓ Ready — press play!', 'ok');
        document.getElementById('scBar').style.display = 'flex';
        // get track title
        scWidget.getCurrentSound(s => {
            if (s && s.title) {
                document.getElementById('scName').textContent = s.title;
                document.getElementById('gName').textContent = s.title;
            }
        });
    });
    scWidget.bind(SC.Widget.Events.PLAY, () => {
        scPlaying = true;
        document.getElementById('scBtn').textContent = '⏸';
        document.getElementById('gPlayBtn').textContent = '⏸';
    });
    scWidget.bind(SC.Widget.Events.PAUSE, () => {
        scPlaying = false;
        document.getElementById('scBtn').textContent = '▶';
        document.getElementById('gPlayBtn').textContent = '▶';
    });
    scWidget.bind(SC.Widget.Events.ERROR, () => {
        setSCNote('✗ Could not load this track. Make sure it\'s a public SoundCloud URL.', 'bad');
    });
}

function toggleSC() {
    if (!scLoaded || !scWidget) return;
    if (scPlaying) scWidget.pause();
    else scWidget.play();
}
function setSCVol(v) {
    scCurrentVol = v;
    if (scWidget && scLoaded) scWidget.setVolume(v);
    if (activeSrc() === 'sc') document.getElementById('gVol').value = v / 100;
}

/* ══ ACTIVE SOURCE ══ */
function activeSrc() {
    if (mp3Loaded) return 'mp3';
    if (scLoaded) return 'sc';
    return null;
}
function gToggle() {
    const s = activeSrc();
    if (s === 'mp3') toggleMp3();
    else if (s === 'sc') toggleSC();
}
function gSetVol(v) {
    const s = activeSrc();
    if (s === 'mp3') { mp3Audio.volume = v; document.getElementById('mp3Vol').value = v; }
    else if (s === 'sc') { setSCVol(Math.round(v * 100)); document.getElementById('scVol').value = Math.round(v * 100); }
}
function setupGMusic() {
    const src = activeSrc();
    const bar = document.getElementById('gMusic');
    bar.style.display = src ? 'flex' : 'none';
    if (src === 'mp3') {
        document.getElementById('gName').textContent = document.getElementById('mp3Name').textContent || 'MP3';
        document.getElementById('gPlayBtn').textContent = mp3Playing ? '⏸' : '▶';
        document.getElementById('gVol').value = mp3Audio.volume;
    } else if (src === 'sc') {
        document.getElementById('gName').textContent = document.getElementById('scName').textContent || 'SoundCloud';
        document.getElementById('gPlayBtn').textContent = scPlaying ? '⏸' : '▶';
        document.getElementById('gVol').value = scCurrentVol / 100;
    }
}