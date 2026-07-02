import { randomInt } from "node:crypto";

const alphabets = {
  lower: "abcdefghjkmnpqrstuvwxyz",
  upper: "ABCDEFGHJKLMNPQRSTUVWXYZ",
  mix: "abcdefghjkmnpqrstuvwxyz23456789",
  num: "23456789"
};

function token(length, charset) {
  const source = alphabets[charset] || alphabets.mix;
  let value = "";
  for (let index = 0; index < length; index += 1) {
    value += source[randomInt(0, source.length)];
  }
  return value;
}

export function generateVoucherBatch(input, router) {
  const quantity = Math.min(Math.max(Number(input.quantity || 1), 1), 500);
  const length = Math.min(Math.max(Number(input.length || 6), 3), 12);
  const mode = input.mode || "voucher";
  const prefix = input.prefix || "";
  const charset = input.charset || "mix";
  const comment = `${prefix || "batch"}-${new Date().toISOString().slice(0, 10)}`;

  return Array.from({ length: quantity }, (_, index) => {
    const username = `${prefix}${token(length, charset)}`;
    const password = mode === "username-password" ? token(length, charset) : username;
    return {
      number: index + 1,
      username,
      password,
      profile: input.profile || "default",
      server: input.server || "all",
      limitUptime: input.limitUptime || "0",
      limitBytesTotal: Number(input.dataLimitMb || 0) * 1024 * 1024,
      price: Number(input.price || 0),
      currency: router.currency,
      dnsName: router.dnsName,
      hotspotName: router.hotspotName,
      comment
    };
  });
}
