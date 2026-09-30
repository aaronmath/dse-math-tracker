/* P1 2020/2023/2026 Q5：主聯立方程、副百分數（資料已寫入 p1-topics，呢度再鎖一次） */
(function () {
  const T = window.P1_TOPICS;
  if (!T || !T.items) return;
  T.items.forEach(x => {
    if ((x.y === 2020 || x.y === 2023 || x.y === 2026) && Number(x.q) === 5) {
      x.topic = "聯立方程";
      x.sub1 = "百分數";
      x.sub2 = "";
    }
  });
})();
