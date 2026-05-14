import crypto from "crypto";
import { createOtpStore, type OtpChannel, type OtpStore } from "./otpStore";

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function normalizeDestination(channel: OtpChannel, destination: string) {
  const d = destination.trim();
  if (channel === "email") return d.toLowerCase();
  return d.replace(/\s+/g, "");
}

function generateOtp() {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export class OtpService {
  private store: OtpStore;

  constructor(
    private config: {
      ttlMs: number;
      attempts: number;
      resendLimit: number;
    },
    store?: OtpStore
  ) {
    this.store = store ?? createOtpStore();
  }

  async requestOtp(input: { channel: OtpChannel; destination: string }) {
    const now = Date.now();
    const destination = normalizeDestination(input.channel, input.destination);
    const requestId = `otp_${crypto.randomBytes(9).toString("hex")}`;
    const otp = generateOtp();

    await this.store.create({
      requestId,
      channel: input.channel,
      destination,
      otpHash: sha256(`${requestId}:${otp}`),
      createdAt: new Date(now),
      expiresAt: new Date(now + this.config.ttlMs),
      attemptsLeft: this.config.attempts,
      resendCount: 0,
    });

    return { requestId, expiresAt: now + this.config.ttlMs, otp, channel: input.channel, destination };
  }

  async resendOtp(input: { requestId: string }) {
    const record = await this.store.get(input.requestId);
    if (!record) throw new Error("OTP_NOT_FOUND");

    if (Date.now() > record.expiresAt.getTime()) {
      await this.store.delete(input.requestId);
      throw new Error("OTP_EXPIRED");
    }

    if (record.resendCount >= this.config.resendLimit) {
      throw new Error("OTP_RESEND_LIMIT");
    }

    const otp = generateOtp();
    await this.store.update(record.requestId, {
      otpHash: sha256(`${record.requestId}:${otp}`),
      resendCount: record.resendCount + 1,
      attemptsLeft: this.config.attempts,
    });

    return {
      requestId: record.requestId,
      expiresAt: record.expiresAt.getTime(),
      otp,
      channel: record.channel,
      destination: record.destination,
    };
  }

  async verifyOtp(input: { requestId: string; otp: string }) {
    const record = await this.store.get(input.requestId);
    if (!record) throw new Error("OTP_NOT_FOUND");

    if (Date.now() > record.expiresAt.getTime()) {
      await this.store.delete(input.requestId);
      throw new Error("OTP_EXPIRED");
    }

    if (record.attemptsLeft <= 0) {
      await this.store.delete(input.requestId);
      throw new Error("OTP_ATTEMPTS_EXCEEDED");
    }

    const expected = record.otpHash;
    const actual = sha256(`${record.requestId}:${input.otp}`);
    if (expected !== actual) {
      await this.store.update(record.requestId, { attemptsLeft: record.attemptsLeft - 1 });
      throw new Error("OTP_INVALID");
    }

    await this.store.delete(input.requestId);
    return { channel: record.channel, destination: record.destination };
  }
}

export const otpService = new OtpService({
  ttlMs: 10 * 60 * 1000,
  attempts: 5,
  resendLimit: 3,
});
