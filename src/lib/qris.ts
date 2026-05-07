const qrisStaticPayload = process.env.NEXT_PUBLIC_QRIS_STATIC_PAYLOAD?.trim() ?? "";

type QrisSegment = {
  id: string;
  value: string;
};

export const isQrisConfigured = Boolean(qrisStaticPayload);

const encodeSegment = (id: string, value: string) =>
  `${id}${value.length.toString().padStart(2, "0")}${value}`;

const parseSegments = (payload: string): QrisSegment[] => {
  const segments: QrisSegment[] = [];
  let index = 0;

  while (index + 4 <= payload.length) {
    const id = payload.slice(index, index + 2);
    const length = Number(payload.slice(index + 2, index + 4));
    const valueStart = index + 4;
    const valueEnd = valueStart + length;

    if (!id || Number.isNaN(length) || valueEnd > payload.length) {
      break;
    }

    segments.push({ id, value: payload.slice(valueStart, valueEnd) });
    index = valueEnd;
  }

  return segments;
};

const calculateCrc16 = (payload: string) => {
  let crc = 0xffff;

  for (let index = 0; index < payload.length; index += 1) {
    crc ^= payload.charCodeAt(index) << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, "0");
};

export const createDynamicQrisPayload = (amount: number) => {
  if (!isQrisConfigured || amount <= 0) return "";

  const amountValue = amount.toFixed(2);
  const baseSegments = parseSegments(qrisStaticPayload).filter(
    (segment) => !["01", "54", "63"].includes(segment.id),
  );

  const segments: QrisSegment[] = [];
  let amountInserted = false;

  for (const segment of baseSegments) {
    segments.push(segment);

    if (segment.id === "00") {
      segments.push({ id: "01", value: "12" });
    }

    if (segment.id === "53") {
      segments.push({ id: "54", value: amountValue });
      amountInserted = true;
    }
  }

  if (!amountInserted) {
    segments.push({ id: "54", value: amountValue });
  }

  const payloadWithoutCrc = `${segments.map((segment) => encodeSegment(segment.id, segment.value)).join("")}6304`;
  return `${payloadWithoutCrc}${calculateCrc16(payloadWithoutCrc)}`;
};

export const createQrisImageUrl = (amount: number) => {
  const payload = createDynamicQrisPayload(amount);
  if (!payload) return "";

  return `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=14&data=${encodeURIComponent(payload)}`;
};
