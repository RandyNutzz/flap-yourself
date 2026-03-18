/* ══ MENU LOGIC ══ */
let userImage = null, currentTheme = 'pixel';

function pickTheme(el, name) {
    sTick();
    document.querySelectorAll('.th').forEach(t => t.classList.remove('on'));
    el.classList.add('on'); currentTheme = name;
    const glow = { pixel: '#5b8dee', cyberpunk: '#ff00ff', space: '#6633ff', forest: '#4a7c2a', ocean: '#0099ff', sunset: '#ff6600' };
    const g = glow[name] || '#5b8dee';
    if (document.getElementById('gameCanvas'))
        document.getElementById('gameCanvas').style.boxShadow = `0 0 40px ${g}44`;
}

function switchTab(t) {
    sTick();
    document.getElementById('tabMp3').classList.toggle('on', t === 'mp3');
    document.getElementById('tabSc').classList.toggle('on', t === 'sc');
    document.getElementById('pMp3').classList.toggle('show', t === 'mp3');
    document.getElementById('pSc').classList.toggle('show', t === 'sc');
}

// Photo
document.getElementById('photoInput').addEventListener('change', e => loadPhoto(e.target.files[0]));
const photoDrop = document.getElementById('photoDrop');
photoDrop.addEventListener('dragover', e => { e.preventDefault(); photoDrop.classList.add('drag'); });
photoDrop.addEventListener('dragleave', () => photoDrop.classList.remove('drag'));
photoDrop.addEventListener('drop', e => { e.preventDefault(); photoDrop.classList.remove('drag'); const f = e.dataTransfer.files[0]; if (f && f.type.startsWith('image/')) loadPhoto(f); });

function loadPhoto(f) {
    if (!f) return;
    const r = new FileReader();
    r.onload = ev => {
        const img = new Image();
        img.onload = () => {
            userImage = img;
            // pd thumb
            const pc = document.getElementById('pdCanvas');
            const px = pc.getContext('2d');
            pc.style.display = 'block'; document.getElementById('pdEmoji').style.display = 'none';
            px.clearRect(0, 0, 72, 72);
            px.save(); px.beginPath(); px.arc(36, 36, 35, 0, Math.PI * 2); px.clip();
            const s = Math.min(img.width, img.height);
            px.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 1, 1, 70, 70);
            px.restore();
            px.beginPath(); px.arc(36, 36, 35, 0, Math.PI * 2);
            px.strokeStyle = '#3ddc84'; px.lineWidth = 2.5; px.stroke();
            photoDrop.classList.add('done');
            document.getElementById('pdTitle').textContent = '✓ Photo loaded — click to change';
            // avatar
            const ac2 = document.getElementById('avatarCanvas');
            const ax = ac2.getContext('2d');
            ac2.style.display = 'block'; document.getElementById('avatarEmoji').style.display = 'none';
            ax.clearRect(0, 0, 56, 56);
            ax.save(); ax.beginPath(); ax.arc(28, 28, 27, 0, Math.PI * 2); ax.clip();
            ax.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 1, 1, 54, 54);
            ax.restore();
            document.getElementById('avatarWrap').classList.add('ready');
            document.getElementById('topSub').textContent = 'You\'re ready to fly! 🚀';
            sScore();
        }; img.src = ev.target.result;
    }; r.readAsDataURL(f);
}

/* ══ TRANSITIONS ══ */
function launch() {
    sTick(); getAC();
    document.getElementById('menuScreen').classList.add('off');
    document.getElementById('gameScreen').classList.remove('off');
    setupGMusic();
    setTimeout(startFresh, 50);
}
function backToMenu() {
    sTick(); cancelAnimationFrame(animId);
    document.getElementById('gameScreen').classList.add('off');
    document.getElementById('menuScreen').classList.remove('off');
}