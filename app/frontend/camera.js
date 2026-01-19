export async function startCamera(video) {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: "environment",
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
  });

  video.srcObject = stream;

  video.muted = true;
  video.playsInline = true;

  await video.play();

  const [track] = stream.getVideoTracks();
  const caps = track.getCapabilities?.() ?? {};

  try {
    const advanced = [];

    if (caps.focusMode?.includes("continuous")) {
      advanced.push({ focusMode: "continuous" });
    }
    if (caps.exposureMode?.includes("continuous")) {
      advanced.push({ exposureMode: "continuous" });
    }
    if (caps.whiteBalanceMode?.includes("continuous")) {
      advanced.push({ whiteBalanceMode: "continuous" });
    }

    if (advanced.length) {
      await track.applyConstraints({ advanced });
    }
  } catch {
    // ignore unsupported constraints
  }

  return stream;
}
