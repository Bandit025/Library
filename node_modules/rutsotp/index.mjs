export const getTimex = async (timenow) => {
  return new Promise(async (resolve) => {
    var [date, month, year, hour, minute, second] = [
      timenow.getDate(),
      timenow.getMonth() + 1,
      timenow.getFullYear(),
      timenow.getHours(),
      timenow.getMinutes(),
      timenow.getSeconds(),
    ];

    if (month < 10) {
      month = "0" + month;
    }
    if (date < 10) {
      date = "0" + date;
    }
    if (hour < 10) {
      hour = "0" + hour;
    }
    if (minute < 10) {
      minute = "0" + minute;
    }
    if (second < 10) {
      second = "0" + second;
    }
    resolve(
      year +
        "-" +
        month +
        "-" +
        date +
        "T" +
        hour +
        ":" +
        minute +
        ":" +
        second,
    );
  });
};

export const Delay = async (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const BufferToHex = async (buffer) => {
  return new Promise(async (resolve) => {
    resolve(
      Array.from(new Uint8Array(buffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join(""),
    );
  });
};

export const hmacKey = async (key) => {
  return new Promise(async (resolve) => {
    resolve(
      await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(key),
        {
          name: "HMAC",
          hash: "SHA-256",
        },
        true,
        ["sign", "verify"],
      ),
    );
  });
};

export const OTP = async (secret) => {
  return await OTPx(secret, new Date());
};

export const OTPx = async (secret, timenow) => {
  return new Promise(async (resolve) => {
    resolve(
      await BufferToHex(
        await crypto.subtle.sign(
          "HMAC",
          await hmacKey(secret),
          new TextEncoder().encode(await getTimex(timenow)),
        ),
      ),
    );
  });
};

export const CheckOTP = async (otp, secrets) => {
  return await CheckOTPs(otp, secrets, 5);
};

export const CheckOTPs = async (otp, secrets, time1) => {
  return new Promise(async (resolve) => {
    for (let s of secrets) {
      if (await CheckOTPx(otp, s, time1)) {
        resolve(true);
      }
    }
    resolve(false);
  });
};

export const CheckOTPx = async (otp, secret, time1) => {
  return new Promise(async (resolve) => {
    const timenow = new Date();
    for (let i = 0; i <= time1; i++) {
      let otpx = await OTPx(secret, new Date(timenow.getTime() - i * 1000));
      if (otpx == otp) {
        resolve(true);
      }
    }
    for (let i = 1; i <= time1; i++) {
      let otpx = await OTPx(secret, new Date(timenow.getTime() + i * 1000));
      if (otpx == otp) {
        resolve(true);
      }
    }
    resolve(false);
  });
};
