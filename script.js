const socket = io();
let peerConnections = {};
const video = document.getElementById('video');

async function start(isSharer) {
  const room = "demo-room";
  socket.emit('join', room);

  if (isSharer) {
    const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
    video.srcObject = stream;

    socket.on('viewer-joined', id => {
      const pc = createPeerConnection(id, stream);
      peerConnections[id] = pc;
    });
  } else {
    const pc = createPeerConnection(socket.id);
    peerConnections[socket.id] = pc;
  }

  socket.on('signal', async ({ from, data }) => {
    const pc = peerConnections[from] || createPeerConnection(from);
    if (data.sdp) {
      await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
      if (data.sdp.type === 'offer') {
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('signal', { to: from, data: { sdp: pc.localDescription } });
      }
    } else if (data.candidate) {
      await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
    }
  });

  socket.on('disconnect-peer', id => {
    if (peerConnections[id]) {
      peerConnections[id].close();
      delete peerConnections[id];
    }
  });
}

function createPeerConnection(id, stream = null) {
  const pc = new RTCPeerConnection();

  if (stream) {
    stream.getTracks().forEach(track => pc.addTrack(track, stream));
    pc.onnegotiationneeded = async () => {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('signal', { to: id, data: { sdp: pc.localDescription } });
    };
  } else {
    pc.ontrack = event => {
      video.srcObject = event.streams[0];
    };
  }

  pc.onicecandidate = event => {
    if (event.candidate) {
      socket.emit('signal', { to: id, data: { candidate: event.candidate } });
    }
  };

  return pc;
}