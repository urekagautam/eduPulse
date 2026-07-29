import fs from "fs";
import FormData from "form-data";
import fetch from "node-fetch";

const send = async (url) => {
  const form = new FormData();
  const imgPath = "./test-image.jpg";
  if (!fs.existsSync(imgPath)) {
    // create a tiny placeholder jpg
    fs.writeFileSync(imgPath, Buffer.from([0xff, 0xd8, 0xff, 0xd9]));
  }
  form.append("image", fs.createReadStream(imgPath));

  try {
    const res = await fetch(url, {
      method: "POST",
      body: form,
      headers: form.getHeaders(),
    });
    const text = await res.text();
    console.log(url, res.status, text);
  } catch (err) {
    console.error("Request failed", err.message || err);
  }
};

(async () => {
  await send("http://localhost:8000/api/notices/upload");
  await send("http://localhost:5000/api/notices/upload");
})();
