export async function startCamera(video) {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: "environment",
      width: { ideal: 1280 },
      height: { ideal: 720 }
    }
  });

  video.srcObject = stream;

  const [track] = stream.getVideoTracks();
  const caps = track.getCapabilities();

  if (caps.focusMode) {
    await track.applyConstraints({ advanced: [{ focusMode: "continuous" }] });
  }
  if (caps.exposureMode) {
    await track.applyConstraints({ advanced: [{ exposureMode: "continuous" }] });
  }
  if (caps.whiteBalanceMode) {
    await track.applyConstraints({ advanced: [{ whiteBalanceMode: "continuous" }] });
  }
}
