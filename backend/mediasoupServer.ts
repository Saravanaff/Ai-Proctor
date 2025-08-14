import * as mediasoup from "mediasoup";
import type { Worker, Router, WebRtcTransport, Producer } from "mediasoup/node/lib/types";
import type { MediaKind } from "mediasoup/node/lib/types";

let worker: Worker;
let router: Router;
const transports = new Map<string, WebRtcTransport>();
const producers = new Map<string, Producer>();

export async function initMediasoup() {
  worker = await mediasoup.createWorker();
  router = await worker.createRouter({
    mediaCodecs: [
      {
        kind: "video",
        mimeType: "video/VP8",
        clockRate: 90000,
      },
    ],
  });
  console.log("✅ Mediasoup initialized");
}


export function getRtpCapabilities() {
  return router.rtpCapabilities;
}

export async function createTransport() {
  const transport = await router.createWebRtcTransport({
    listenIps: [{ ip: "127.0.0.1", announcedIp: undefined }],
    enableUdp: true,
    enableTcp: true,
    preferUdp: true,
  });

  transports.set(transport.id, transport);

  return {
    id: transport.id,
    iceParameters: transport.iceParameters,
    iceCandidates: transport.iceCandidates,
    dtlsParameters: transport.dtlsParameters,
  };
}

export async function connectTransport(transportId: string, dtlsParameters: any) {
  const transport = transports.get(transportId);
  if (!transport) throw new Error("Transport not found");
  await transport.connect({ dtlsParameters });
}


export async function produce(transportId: string, kind: MediaKind, rtpParameters: any) {
  const transport = transports.get(transportId);
  if (!transport) throw new Error("Transport not found");

  const producer = await transport.produce({ kind, rtpParameters });
  producers.set(producer.id, producer);
  return producer.id;
}
