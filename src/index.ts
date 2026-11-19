import './style.css';

const ICE_GATHERING_TIMEOUT_MS = 5000;

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const statusEl = $<HTMLSpanElement>('status');
const setupEl = $<HTMLElement>('setup');
const chatEl = $<HTMLElement>('chat');
const peerCodeEl = $<HTMLTextAreaElement>('peer-code');
const myCodeEl = $<HTMLTextAreaElement>('my-code');
const actionBtn = $<HTMLButtonElement>('action-btn');
const copyBtn = $<HTMLButtonElement>('copy-btn');
const hintEl = $<HTMLParagraphElement>('hint');
const messagesEl = $<HTMLDivElement>('messages');
const chatForm = $<HTMLFormElement>('chat-form');
const msgInput = $<HTMLInputElement>('msg-input');

const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
let channel: RTCDataChannel | null = null;
let busy = false;

const encode = (desc: RTCSessionDescriptionInit) => btoa(JSON.stringify({ type: desc.type, sdp: desc.sdp }));

function decode(code: string): RTCSessionDescriptionInit {
    const desc = JSON.parse(atob(code.trim()));

    if ((desc.type !== 'offer' && desc.type !== 'answer') || typeof desc.sdp !== 'string') {
        throw new Error('Invalid code');
    }

    return desc;
}

function setStatus(text: string, state: 'idle' | 'pending' | 'connected') {
    statusEl.textContent = text;
    statusEl.dataset.state = state;
}

function setHint(text: string, isError = false) {
    hintEl.textContent = text;
    hintEl.classList.toggle('error', isError);
}

function logMsg(text: string, type: 'system' | 'sent' | 'received' = 'system') {
    const div = document.createElement('div');
    div.className = `msg ${type}`;
    div.textContent = text;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
}

function waitForIceGathering(): Promise<void> {
    if (pc.iceGatheringState === 'complete') return Promise.resolve();

    return new Promise((resolve) => {
        const done = () => {
            clearTimeout(timer);
            pc.removeEventListener('icegatheringstatechange', onChange);
            resolve();
        };
        const onChange = () => pc.iceGatheringState === 'complete' && done();
        const timer = setTimeout(done, ICE_GATHERING_TIMEOUT_MS);

        pc.addEventListener('icegatheringstatechange', onChange);
    });
}

async function publishLocalDescription() {
    await waitForIceGathering();
    myCodeEl.value = encode(pc.localDescription!);
    copyBtn.disabled = false;
}

function setupChannel(ch: RTCDataChannel) {
    channel = ch;

    ch.onopen = () => {
        setStatus('Connected', 'connected');
        setupEl.hidden = true;
        chatEl.hidden = false;
        logMsg('Connected. Say hi!');
        msgInput.focus();
    };

    ch.onclose = () => {
        setStatus('Disconnected', 'idle');
        msgInput.disabled = true;
        logMsg('Connection closed.');
    };

    ch.onmessage = (e) => logMsg(String(e.data), 'received');
}

pc.ondatachannel = (e) => setupChannel(e.channel);

/** Decides what the single button does based on the connection state and the first input. */
function updateAction() {
    const hasInput = peerCodeEl.value.trim() !== '';

    if (pc.signalingState === 'have-local-offer') {
        actionBtn.textContent = 'Connect';
        actionBtn.disabled = busy || !hasInput;
    } else if (pc.signalingState === 'stable' && !pc.localDescription) {
        actionBtn.textContent = hasInput ? 'Join' : 'Host';
        actionBtn.disabled = busy;
    } else {
        actionBtn.textContent = 'Waiting for peer…';
        actionBtn.disabled = true;
    }
}

async function host() {
    setupChannel(pc.createDataChannel('chat'));
    setStatus('Generating code…', 'pending');

    await pc.setLocalDescription(await pc.createOffer());
    await publishLocalDescription();

    peerCodeEl.value = '';
    peerCodeEl.placeholder = "Paste the peer's reply code here…";
    setStatus('Waiting for reply', 'pending');
    setHint("You are the host. Send your code to the peer, then paste their reply above and press Connect.");
}

async function join(offer: RTCSessionDescriptionInit) {
    setStatus('Generating code…', 'pending');

    await pc.setRemoteDescription(offer);
    await pc.setLocalDescription(await pc.createAnswer());
    await publishLocalDescription();

    peerCodeEl.readOnly = true;
    setStatus('Waiting for host', 'pending');
    setHint('You are the client. Send your code back to the host — the chat opens once they connect.');
}

async function connect(answer: RTCSessionDescriptionInit) {
    setStatus('Connecting…', 'pending');
    await pc.setRemoteDescription(answer);
    peerCodeEl.readOnly = true;
    setHint('Connecting…');
}

async function onAction() {
    const raw = peerCodeEl.value.trim();

    busy = true;
    updateAction();
    setHint('');

    try {
        if (!raw && pc.signalingState === 'stable') {
            await host();
        } else {
            const desc = decode(raw);

            if (pc.signalingState === 'have-local-offer') {
                if (desc.type !== 'answer') throw new Error("That's an invite code — paste the peer's reply instead.");
                await connect(desc);
            } else {
                if (desc.type !== 'offer') throw new Error("That's a reply code — paste the host's code instead.");
                await join(desc);
            }
        }
    } catch (err) {
        const message = err instanceof Error && !(err instanceof SyntaxError) && err.name !== 'InvalidCharacterError'
            ? err.message
            : 'Invalid code';

        setStatus('Not connected', 'idle');
        setHint(message, true);
    } finally {
        busy = false;
        updateAction();
    }
}

actionBtn.addEventListener('click', onAction);
peerCodeEl.addEventListener('input', updateAction);

copyBtn.addEventListener('click', async () => {
    try {
        await navigator.clipboard.writeText(myCodeEl.value);
    } catch {
        myCodeEl.select();
        document.execCommand('copy');
    }

    copyBtn.textContent = 'Copied!';
    setTimeout(() => (copyBtn.textContent = 'Copy'), 1500);
});

chatForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const text = msgInput.value.trim();

    if (!text || channel?.readyState !== 'open') return;

    channel.send(text);
    logMsg(text, 'sent');
    msgInput.value = '';
});

pc.addEventListener('connectionstatechange', () => {
    if (pc.connectionState === 'failed') {
        setStatus('Connection failed', 'idle');
        setHint('Connection failed. Reload the page to try again.', true);
    }
});

updateAction();
