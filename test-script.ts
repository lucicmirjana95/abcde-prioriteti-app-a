import fetch from "node-fetch";

async function run() {
  const res = await fetch("http://localhost:3000/api/morning-reset-parse", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      brainDump: "Zelim da napravim veliku aplikaciju. Imam ideju za app. Brinem se oko para. Moram da kupim hleb danas.",
      language: "sr",
      theme: "General"
    })
  });
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}
run();
