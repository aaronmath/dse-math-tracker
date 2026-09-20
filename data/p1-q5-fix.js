/* P1 2020/2023 Q5: 主聯立方程、副百分數 */
(function () {
  const T = window.P1_TOPICS;
  if (!T || !T.items) return;
  T.items.forEach(x => {
    if ((x.y === 2020 || x.y === 2023) && Number(x.q) === 5) {
      x.topic = "聯立方程";
      x.sub1 = "百分數";
      x.sub2 = x.sub2 || "";
    }
  });
  const freqOf = name => (T.freq || []).find(f => f.topic === name && f.part === "甲");
  const pct = freqOf("百分數");
  const sim = freqOf("聯立方程");
  if (pct) { pct.years = [4,0,4,4,4,0,5,4,0,4,4,0,4,5,8]; pct.total = 50; }
  if (sim) { sim.years = [4,4,0,4,0,4,0,4,4,4,3,4,0,0,0]; sim.total = 35; }
})();
